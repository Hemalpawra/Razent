import type { Product } from "@/lib/types/product"
import { listProducts } from "@/lib/api/client"

export interface VectorSearchResult {
  product: Product
  score: number
  matchedTerms: string[]
}

/**
 * Lightweight local semantic vector representation
 * Generates normalized term-frequency and semantic weight vectors for fast in-browser/edge RAG retrieval.
 */
class SemanticVectorEngine {
  private cache: Map<string, { product: Product; vector: Map<string, number>; magnitude: number }> = new Map()
  private isIndexed = false

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1)
  }

  /**
   * Generates semantic vector for product attributes
   */
  private createProductVector(p: Product): { vector: Map<string, number>; magnitude: number } {
    const termWeights = new Map<string, number>()

    // Title terms (highest weight)
    this.tokenize(p.title).forEach((t) => {
      termWeights.set(t, (termWeights.get(t) || 0) + 4.0)
    })

    // Category terms
    this.tokenize(p.category).forEach((t) => {
      termWeights.set(t, (termWeights.get(t) || 0) + 3.0)
    })

    // Tags terms (protein, organic, fresh, bestseller)
    (p.tags || []).forEach((tag) => {
      this.tokenize(tag).forEach((t) => {
        termWeights.set(t, (termWeights.get(t) || 0) + 3.5)
      })
    })

    // Description terms
    this.tokenize(p.description || "").forEach((t) => {
      termWeights.set(t, (termWeights.get(t) || 0) + 1.5)
    })

    // Semantic synonyms / attribute expansion for common quick-commerce queries
    const textCombined = `${p.title} ${p.category} ${(p.tags || []).join(" ")} ${p.description || ""}`.toLowerCase()
    if (textCombined.includes("protein") || textCombined.includes("egg") || textCombined.includes("milk") || textCombined.includes("yogurt")) {
      termWeights.set("gym", (termWeights.get("gym") || 0) + 2.0)
      termWeights.set("workout", (termWeights.get("workout") || 0) + 2.0)
      termWeights.set("healthy", (termWeights.get("healthy") || 0) + 2.0)
    }
    if (textCombined.includes("fruit") || textCombined.includes("banana") || textCombined.includes("apple") || textCombined.includes("berry")) {
      termWeights.set("breakfast", (termWeights.get("breakfast") || 0) + 2.0)
      termWeights.set("fresh", (termWeights.get("fresh") || 0) + 2.0)
    }
    if (textCombined.includes("oats") || textCombined.includes("bread") || textCombined.includes("milk")) {
      termWeights.set("breakfast", (termWeights.get("breakfast") || 0) + 2.5)
    }
    if (textCombined.includes("snack") || textCombined.includes("chips") || textCombined.includes("chocolate") || textCombined.includes("cookie")) {
      termWeights.set("munchies", (termWeights.get("munchies") || 0) + 2.5)
      termWeights.set("snacking", (termWeights.get("snacking") || 0) + 2.5)
    }

    // Calculate Euclidean magnitude for cosine normalization
    let sumSq = 0
    termWeights.forEach((w) => {
      sumSq += w * w
    })
    const magnitude = Math.sqrt(sumSq) || 1

    return { vector: termWeights, magnitude }
  }

  /**
   * Index active catalog into vector memory
   */
  public async indexCatalog(products?: Product[]): Promise<void> {
    const items = products || (await listProducts())
    this.cache.clear()

    items.forEach((p) => {
      if (p.status === "active") {
        const { vector, magnitude } = this.createProductVector(p)
        this.cache.set(p.id, { product: p, vector, magnitude })
      }
    })
    this.isIndexed = true
  }

  /**
   * Execute Hybrid Cosine Vector Similarity + Price & Category filtering
   */
  public async search(
    query: string,
    options: {
      maxPricePaise?: number
      category?: string
      limit?: number
      minScore?: number
    } = {}
  ): Promise<VectorSearchResult[]> {
    if (!this.isIndexed || this.cache.size === 0) {
      await this.indexCatalog()
    }

    const { maxPricePaise, category, limit = 6, minScore = 0.08 } = options
    const queryTokens = this.tokenize(query)
    if (queryTokens.length === 0) return []

    // Parse natural language price mentions in query (e.g. "under 500", "under ₹300")
    let dynamicMaxPrice = maxPricePaise
    const priceMatch = query.match(/(?:under|below|less than|within)\s*(?:₹|rs\.?|inr)?\s*(\d+)/i)
    if (priceMatch && !dynamicMaxPrice) {
      dynamicMaxPrice = parseInt(priceMatch[1], 10) * 100
    }

    // Create query vector
    const queryVector = new Map<string, number>()
    queryTokens.forEach((t) => {
      queryVector.set(t, (queryVector.get(t) || 0) + 1.0)
    })
    let qSumSq = 0
    queryVector.forEach((w) => {
      qSumSq += w * w
    })
    const qMagnitude = Math.sqrt(qSumSq) || 1

    const results: VectorSearchResult[] = []

    this.cache.forEach(({ product, vector, magnitude }) => {
      // 1. Hard filters: price & category
      if (dynamicMaxPrice && product.price_paise > dynamicMaxPrice) {
        return
      }
      if (category && category !== "All" && product.category.toLowerCase() !== category.toLowerCase()) {
        return
      }

      // 2. Cosine similarity calculation
      let dotProduct = 0
      const matchedTerms: string[] = []

      queryVector.forEach((qWeight, token) => {
        if (vector.has(token)) {
          dotProduct += qWeight * vector.get(token)!
          matchedTerms.push(token)
        } else {
          // Substring partial match bonus
          vector.forEach((pWeight, pToken) => {
            if (pToken.includes(token) || token.includes(pToken)) {
              dotProduct += qWeight * pWeight * 0.4
              matchedTerms.push(pToken)
            }
          })
        }
      })

      const cosineSimilarity = dotProduct / (qMagnitude * magnitude)

      if (cosineSimilarity >= minScore || matchedTerms.length > 0) {
        results.push({
          product,
          score: cosineSimilarity,
          matchedTerms: Array.from(new Set(matchedTerms)),
        })
      }
    })

    // Sort by descending semantic relevance score
    results.sort((a, b) => b.score - a.score)
    return results.slice(0, limit)
  }

  /**
   * RAG Context Generator: Formats retrieved products into structured grounding context
   */
  public async buildRAGContext(query: string, maxItems = 6): Promise<{ contextText: string; products: Product[] }> {
    const results = await this.search(query, { limit: maxItems })
    const products = results.map((r) => r.product)

    if (products.length === 0) {
      return { contextText: "No specific catalog items matched the query.", products: [] }
    }

    const contextText = products
      .map(
        (p, idx) =>
          `[Item ${idx + 1}] ID: ${p.id} | Title: ${p.title} | Price: ₹${p.price_paise / 100} | Category: ${
            p.category
          } | Stock: ${p.stock} | Tags: ${(p.tags || []).join(", ")} | Description: ${p.description || "N/A"}`
      )
      .join("\n")

    return { contextText, products }
  }
}

export const semanticVectorEngine = new SemanticVectorEngine()
