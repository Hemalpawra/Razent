import drawerProductImg from "@/imports/1920WLight-3/2181d1d07206373641045a7dfed5cb16e145158c.png"

interface OrderDrawerProps {
  onClose: () => void
}

export default function OrderDrawer({ onClose }: OrderDrawerProps) {
  return (
    <div className="absolute inset-0 flex items-stretch">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/20 cursor-pointer"
        onClick={onClose}
      />
      {/* Drawer panel */}
      <div className="w-[380px] bg-white shadow-2xl flex flex-col overflow-hidden border-l border-[rgba(108,132,157,0.18)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[rgba(108,132,157,0.12)]">
          <h2 className="text-[18px] font-['Poppins:SemiBold',sans-serif] font-semibold text-[#050505] leading-none">
            Order Details
          </h2>
          <button
            onClick={onClose}
            className="w-[28px] h-[28px] flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4L12 12" stroke="#192839" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Order Items */}
          <div className="px-6 py-4 border-b border-[rgba(108,132,157,0.12)]">
            <p className="text-[11px] font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#768EA7] uppercase tracking-[0.08em] mb-3">
              Order Items
            </p>
            <div className="flex items-center gap-3">
              <div className="w-[56px] h-[56px] rounded-lg bg-[#f5f5f4] flex-shrink-0 overflow-hidden">
                <img
                  src={drawerProductImg}
                  alt="Air Purifier Pro"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#192839] leading-5">
                  Air Purifier Pro
                </p>
                <p className="text-[12px] font-['Inter:Regular',sans-serif] text-[#768EA7] leading-4">
                  Smart Air Purifier
                </p>
                <p className="text-[12px] font-['Inter:Regular',sans-serif] text-[#768EA7] leading-4 mt-0.5">
                  Qty: 1
                </p>
              </div>
              <p className="text-[14px] font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#192839] flex-shrink-0">
                ₹16,999
              </p>
            </div>
          </div>

          {/* Amount Paid */}
          <div className="px-6 py-4 border-b border-[rgba(108,132,157,0.12)]">
            <p className="text-[11px] font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#768EA7] uppercase tracking-[0.08em] mb-2">
              Amount Paid
            </p>
            <div className="flex items-baseline gap-0.5">
              <span className="text-[18px] font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#192839] opacity-70">₹</span>
              <span className="text-[28px] font-['TASA_Orbiter_Display:SemiBold',sans-serif] text-[#192839] leading-8">
                1,000
              </span>
              <span className="text-[18px] font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#192839]">.00</span>
            </div>

            {/* View Invoice button */}
            <button className="mt-3 w-full h-[36px] border border-[#305EFF] rounded-lg flex items-center justify-center gap-2 text-[#305EFF] text-[14px] font-['Inter:Medium',sans-serif] font-medium hover:bg-[rgba(48,94,255,0.05)] transition-colors">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" stroke="#305EFF" strokeWidth="1.2" />
                <path d="M4 5h6M4 7h6M4 9h3.5" stroke="#305EFF" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              View Invoice
            </button>
          </div>

          {/* Customer Details */}
          <div className="px-6 py-4 border-b border-[rgba(108,132,157,0.12)]">
            <p className="text-[11px] font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#768EA7] uppercase tracking-[0.08em] mb-3">
              Customer Details
            </p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                  <circle cx="7" cy="4.5" r="2.5" stroke="#768EA7" strokeWidth="1.2" />
                  <path d="M1.5 12.5c0-2.761 2.462-5 5.5-5s5.5 2.239 5.5 5" stroke="#768EA7" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <span className="text-[13px] font-['Inter:Regular',sans-serif] text-[#192839]">ChatGPT Assistant</span>
              </div>
              <div className="flex items-center gap-2.5">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                  <rect x="1" y="3" width="12" height="8" rx="1.5" stroke="#768EA7" strokeWidth="1.2" />
                  <path d="M1 5.5l6 3.5 6-3.5" stroke="#768EA7" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <span className="text-[13px] font-['Inter:Regular',sans-serif] text-[#192839]">chatgpt.assistant@example.com</span>
              </div>
              <div className="flex items-center gap-2.5">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                  <path d="M3.5 1.5h2.5l1 2.5-1.5 1A7.5 7.5 0 0 0 9 9l1-1.5 2.5 1V11a1 1 0 0 1-1 1C4.716 12 2 9.284 2 3.5a1 1 0 0 1 1-1z" stroke="#768EA7" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-[13px] font-['Inter:Regular',sans-serif] text-[#192839]">+91 98765 43210</span>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="px-6 py-4 border-b border-[rgba(108,132,157,0.12)]">
            <p className="text-[11px] font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#768EA7] uppercase tracking-[0.08em] mb-3">
              Payment Details
            </p>
            <div className="space-y-2">
              {([
                ["Payment ID", "pay_Mk92jd8l90sk"],
                ["Razorpay Order ID", "order_Mk92jd8l90sk"],
                ["Payment Method", "UPI"],
                ["Paid On", "May 27, 2025 10:25 AM"],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4">
                  <span className="text-[12px] font-['Inter:Regular',sans-serif] text-[#768EA7] leading-5">
                    {label}
                  </span>
                  <span className="text-[12px] font-['Inter:Regular',sans-serif] text-[#192839] leading-5 text-right">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Order Timeline */}
          <div className="px-6 py-4">
            <p className="text-[11px] font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#768EA7] uppercase tracking-[0.08em] mb-3">
              Order Timeline
            </p>
            <div className="space-y-3">
              {([
                ["Order Created", "May 27, 2025 10:24 AM", true],
                ["Payment Successful", "May 27, 2025 10:25 AM", true],
                ["Invoice Generated", "May 27, 2025 10:26 AM", true],
                ["Shipped", "May 27, 2025 10:40 AM", true],
                ["Delivered", "May 27, 2025 11:00 AM", false],
              ] as [string, string, boolean][]).map(([label, date, done]) => (
                <div key={label} className="flex items-start gap-3">
                  <div
                    className={`w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      done ? "bg-[#22c55e]" : "bg-[rgba(108,132,157,0.2)]"
                    }`}
                  >
                    {done && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path
                          d="M2 5l2.5 2.5L8 3"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-[13px] font-['Inter:Medium',sans-serif] font-medium leading-5 ${
                        done ? "text-[#192839]" : "text-[#768EA7]"
                      }`}
                    >
                      {label}
                    </p>
                    <p className="text-[11px] font-['Inter:Regular',sans-serif] text-[#768EA7] leading-4">
                      {date}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-[rgba(108,132,157,0.12)] space-y-2.5 flex-shrink-0">
          <div className="flex gap-3">
            <button className="flex-1 h-[36px] border border-[rgba(108,132,157,0.3)] rounded-lg text-[13px] font-['Inter:Medium',sans-serif] font-medium text-[#192839] flex items-center justify-center gap-1.5 hover:bg-gray-50 transition-colors">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M1.5 6.5C1.5 3.74 3.74 1.5 6.5 1.5S11.5 3.74 11.5 6.5 9.26 11.5 6.5 11.5c-1 0-1.94-.28-2.73-.76L1 11.5l.76-2.77A4.98 4.98 0 0 1 1.5 6.5z" stroke="#192839" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              View Conversation
            </button>
            <button className="flex-1 h-[36px] border border-[rgba(108,132,157,0.3)] rounded-lg text-[13px] font-['Inter:Medium',sans-serif] font-medium text-[#192839] flex items-center justify-center gap-1.5 hover:bg-gray-50 transition-colors">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 1.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM6.5 4v3l2 1" stroke="#192839" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              View Tracking
            </button>
          </div>
          <button className="w-full h-[40px] bg-[#305EFF] rounded-lg text-white text-[14px] font-['Inter:Medium',sans-serif] font-medium flex items-center justify-center gap-2 hover:bg-[#2450e0] transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5L7 8M4.5 5l2.5-3 2.5 3" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M1.5 10h11v1.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V10z" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Refund Order
          </button>
        </div>
      </div>
    </div>
  )
}
