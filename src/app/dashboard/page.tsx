"use client";

export default function DashboardPage() {

  const smallCards = [
    {
      title: "All-Time Gross Profit",
      value: "823,847",
      style: "from-orange-400 to-orange-600 text-white",
    },
    {
      title: "YTD Revenue",
      value: "932,847",
    },
    {
      title: "YTD Expenses",
      value: "654,847",
    },
    {
      title: "Available Funds",
      value: "115,847",
    },
    {
      title: "Average Order Value",
      value: "₱22,387.12",
    },
    {
      title: "Total Orders",
      value: "115,847",
    },
    {
      title: "All-time Items Sold",
      value: "112,847",
    },
    {
      title: "Business Profit Margin",
      value: "28%",
    },

    
    
  ]

  return (
    <div className="flex flex-col gap-1 h-full w-full">
      <div className="flex flex-col gap-1 border">
        <h1 className="text-2xl font-semibold">Header</h1>
      </div>
      <div className="h-auto flex flex-wrap items-start justify-center gap-0">

        {smallCards.map((card, index) => (
          <div key={index} className="w-full md:w-1/5 h-26 md:min-w-66 md:max-w-2/5 flex-grow-1 p-2">
            <div className="flex flex-col w-full h-full bg-gray-50 rounded shadow p-2">
              <h1 className="text-sm font-medium">{card.title}</h1>
              <h1 className="m-auto text-2xl font-bold">{card.value}</h1>
            </div>
          </div>
        ))}
        
      </div>
    </div>
  );
}
