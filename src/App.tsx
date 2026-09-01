import { useState, type FormEvent } from "react"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Project = {
  id: string
  title: string
  category: string
  year: string
  description: string
  features: string[]
  tags: string[]
  details: string
}

const projects: Project[] = [
  {
    id: "asset-management",
    title: "Asset Management System",
    category: "Product Design",
    year: "2022",
    description:
      "A comprehensive asset management platform designed to streamline inventory tracking and resource allocation for enterprise teams.",
    features: [
      "Wireframe: Interactive prototype",
      "Dashboards, Forms, Visual reports",
      "Reusable UI components for consistency",
    ],
    tags: ["Web App design", "Mobile App"],
    details:
      "Designed end-to-end flows for inventory intake, depreciation, and reporting. Built a small reusable kit of cards, tables, and form controls so every screen feels consistent across departments.",
  },
  {
    id: "food-delivery",
    title: "Food Delivery Platform",
    category: "Product Design",
    year: "2022",
    description:
      "A user-friendly food delivery application with seamless ordering experience and real-time tracking capabilities.",
    features: ["User journey mapping", "Mobile-first responsive design", "Payment integration flows"],
    tags: ["Mobile App", "Website Design"],
    details:
      "Mapped the order-to-doorstep journey end to end. Reduced checkout friction by collapsing the address and payment steps into a single sheet.",
  },
  {
    id: "trackify-asset",
    title: "Trackify Asset",
    category: "Product Design",
    year: "2022",
    description:
      "An innovative asset tracking solution with IoT integration and advanced analytics for modern businesses.",
    features: ["IoT dashboard design", "Data visualization components", "Real-time monitoring interface"],
    tags: ["Webflow Builder", "No-code Development"],
    details:
      "Designed a live-monitoring dashboard with a custom IoT card system and alert primitives. Components were reused for an executive mobile view.",
  },
]

const skills = ["UI/UX", "Web / Sites", "Design tools", "AI Stack"]

const navLinks = [
  { href: "#work", label: "Work" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
]

export default function App() {
  const [openProject, setOpenProject] = useState<Project | null>(null)
  const [contact, setContact] = useState({ name: "", message: "" })
  const [submitted, setSubmitted] = useState(false)

  function handleContactSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="min-h-full bg-background text-foreground">
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <a href="#top" className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              HS
            </span>
            <span className="font-heading text-sm font-medium">Heemal Singh</span>
          </a>
          <ul className="flex items-center gap-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main-content">
        {/* Hero */}
        <section id="top" className="mx-auto max-w-5xl px-4 py-20 sm:py-28">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div className="space-y-6">
              <h1 className="text-3xl font-heading font-medium leading-tight sm:text-5xl">
                I design clean and simple interfaces{" "}
                <span className="text-primary">
                  that help people work faster &amp; easy to use.
                </span>
              </h1>
              <p className="max-w-prose text-sm text-muted-foreground sm:text-base">
                I am Heemal Singh — a UI/UX Designer who builds real, working
                products for web and mobile. On this site you will find my work,
                my approach, and what I bring to a product team and your
                product.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button render={<a href="#work" />}>See work</Button>
                <Button
                  variant="outline"
                  render={<a href="mailto:heemal.ux@gmail.com" />}
                >
                  Email
                </Button>
              </div>
            </div>
            <Card className="aspect-square items-center justify-center text-center">
              <CardHeader>
                <CardTitle className="text-base">Prowess Enterprise</CardTitle>
                <CardDescription>UI/UX · Web · Mobile</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {["700+", "2", "2"].map((value, i) => (
                    <div key={i} className="rounded-md border border-border/60 p-3">
                      <div className="font-heading text-lg">{value}</div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {["UI designed", "Products", "Sites"][i]}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* About / process */}
        <section id="about" className="border-t border-border/60">
          <div className="mx-auto max-w-5xl px-4 py-16">
            <h2 className="text-2xl font-heading font-medium sm:text-3xl">
              I keep work simple and clear.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You will know the steps and one from the start.
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Design Principles</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>· Iterating first — I always start by understanding users.</li>
                    <li>· Prototypes over polishing — test early, refine often.</li>
                    <li>· Ready for team handoff — deliver what teams can build fast.</li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Process</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>1. Understanding the requirements</li>
                    <li>2. Wireframe &amp; prototype</li>
                    <li>3. UI design &amp; components</li>
                    <li>4. Ready for build</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Work */}
        <section id="work" className="border-t border-border/60">
          <div className="mx-auto max-w-5xl px-4 py-16">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-heading font-medium sm:text-3xl">
                  Selected work
                </h2>
                <p className="mt-2 max-w-prose text-sm text-muted-foreground">
                  A collection of projects where design thinking met real
                  product needs and helped teams move faster.
                </p>
              </div>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Card key={project.id} className="h-full">
                  <CardHeader>
                    <CardDescription>
                      <span className="text-foreground/80">{project.category}</span>
                      <span className="ml-2 text-muted-foreground">{project.year}</span>
                    </CardDescription>
                    <CardTitle className="text-base">{project.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {project.description}
                    </p>
                    <ul className="mt-4 space-y-1 text-xs">
                      {project.features.map((feature) => (
                        <li key={feature}>· {feature}</li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="mt-auto flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                    <CardAction>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setOpenProject(project)}
                      >
                        View
                      </Button>
                    </CardAction>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Skills */}
        <section className="border-t border-border/60">
          <div className="mx-auto max-w-5xl px-4 py-16">
            <h2 className="text-2xl font-heading font-medium sm:text-3xl">
              Skills &amp; tools
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              What I use and know to design clear interfaces, prototypes and
              for development.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {skills.map((skill) => (
                <Card key={skill} className="items-center text-center">
                  <CardHeader>
                    <CardTitle>{skill}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="border-t border-border/60">
          <div className="mx-auto grid max-w-5xl gap-8 px-4 py-16 md:grid-cols-[1fr_1fr]">
            <div>
              <h2 className="text-2xl font-heading font-medium sm:text-3xl">
                Let us create something{" "}
                <span className="text-primary">extraordinary together</span>
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                If you want to discuss a product role, a team need, or a
                project at company level, get in touch:
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button render={<a href="mailto:heemal.ux@gmail.com" />}>
                  Email
                </Button>
                <Button
                  variant="outline"
                  render={
                    <a
                      href="https://linkedin.com/in/heemalsingh"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  LinkedIn
                </Button>
              </div>
              <div className="mt-8 rounded-lg border border-border/60 p-4 text-sm">
                <div className="font-heading text-base">
                  Heemal Singh — UI/UX Designer — Prowess Enterprise
                </div>
                <div className="text-muted-foreground">heemal.ux@gmail.com</div>
                <div className="text-muted-foreground">
                  linkedin.com/in/heemalsingh
                </div>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Send a quick message</CardTitle>
                <CardDescription>
                  I&apos;ll get back to you within a couple of days.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {submitted ? (
                  <p className="rounded-md border border-border/60 bg-muted/40 p-3 text-sm">
                    Thanks — your message is queued. I&apos;ll reply from
                    heemal.ux@gmail.com.
                  </p>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-3">
                    <Input
                      placeholder="Your name"
                      value={contact.name}
                      onChange={(event) =>
                        setContact((prev) => ({ ...prev, name: event.target.value }))
                      }
                      required
                    />
                    <Input
                      type="email"
                      placeholder="Your email"
                      required
                    />
                    <textarea
                      placeholder="What are you working on?"
                      value={contact.message}
                      onChange={(event) =>
                        setContact((prev) => ({
                          ...prev,
                          message: event.target.value,
                        }))
                      }
                      className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs/relaxed shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                      required
                    />
                    <Button type="submit" className="w-full">
                      Send
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        © 2023 Heemal Singh. Designed with care and attention to detail.
      </footer>

      {/* Project dialog */}
      <Dialog
        open={openProject !== null}
        onOpenChange={(open) => {
          if (!open) setOpenProject(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{openProject?.title}</DialogTitle>
            <DialogDescription>
              {openProject?.category} · {openProject?.year}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{openProject?.details}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            {openProject?.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenProject(null)}>
              Close
            </Button>
            <Button render={<a href="#contact" />}>Get in touch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}