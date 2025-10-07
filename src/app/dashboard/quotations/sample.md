"use client"

import { useState, useMemo, useEffect } from "react"
import { ProductCard, Product } from "@/components/product-card"
import { Pagination } from "@/components/pagination"
import { CartSidebar } from "@/components/cart-sidebar"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Search, Filter, ShoppingCart, LayoutGrid, List, Plus, Minus, X, Download, MoreVertical, Eye, Pencil, Copy, FileText, Trash2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

// Mock product data - Office Supplies
const mockProducts: Product[] = [
  {
    id: 1,
    name: "Hard Copy Paper (Substance 20) - A4",
    description: "Paper - Copy20 | Brand: Advance | SKU: PAP-000001",
    price: 163,
    category: "Paper Products",
    stock: 100,
  },
  {
    id: 2,
    name: "Hard Copy Paper (Substance 20) - Legal (8.5x13)",
    description: "Paper - Copy20 | Brand: Advance | SKU: PAP-000002",
    price: 186,
    category: "Paper Products",
    stock: 80,
  },
  {
    id: 3,
    name: "Hard Copy Paper (Substance 20) - Letter",
    description: "Paper - Copy20 | Brand: Advance | SKU: PAP-000003",
    price: 157,
    category: "Paper Products",
    stock: 90,
  },
  {
    id: 4,
    name: "Hard Copy Paper (Substance 24) - A4",
    description: "Paper - Copy24 | Brand: Advance | SKU: PAP-000004",
    price: 187,
    category: "Paper Products",
    stock: 75,
  },
  {
    id: 5,
    name: "Hard Copy Paper (Substance 24) - Legal (8.5x13)",
    description: "Paper - Copy24 | Brand: Advance | SKU: PAP-000005",
    price: 213,
    category: "Paper Products",
    stock: 60,
  },
  {
    id: 6,
    name: "Hard Copy Paper (Substance 24) - Letter",
    description: "Paper - Copy24 | Brand: Advance | SKU: PAP-000006",
    price: 180,
    category: "Paper Products",
    stock: 85,
  },
  {
    id: 7,
    name: "ADVANCE BALIKBAYAN BOX (20X20X20 IN) - BROWN",
    description: "Box - Balikbayan | Brand: Advance | SKU: STG-000001",
    price: 103,
    category: "Storage Solutions",
    stock: 50,
  },
  {
    id: 8,
    name: "ADVANCE BALIKBAYAN BOX (20X20X20 IN) - WHITE",
    description: "Box - Balikbayan | Brand: Advance | SKU: STG-000002",
    price: 160,
    category: "Storage Solutions",
    stock: 40,
  },
  {
    id: 9,
    name: "ADVANCE STORE-ALL (10.25X12.5X15.75)",
    description: "Box - Storage | Brand: Advance | SKU: STG-000003",
    price: 95,
    category: "Storage Solutions",
    stock: 65,
  },
  {
    id: 10,
    name: "A-Plus Copy Paper (Substance 20) - A4",
    description: "Paper - Copy20 | Brand: A-Plus | SKU: PAP-000007",
    price: 132.7,
    category: "Paper Products",
    stock: 120,
  },
  {
    id: 11,
    name: "A-Plus Copy Paper (Substance 20) - Legal",
    description: "Paper - Copy20 | Brand: A-Plus | SKU: PAP-000008",
    price: 151.3,
    category: "Paper Products",
    stock: 95,
  },
  {
    id: 12,
    name: "A-Plus Copy Paper (Substance 20) - Letter",
    description: "Paper - Copy20 | Brand: A-Plus | SKU: PAP-000009",
    price: 128,
    category: "Paper Products",
    stock: 110,
  },
  {
    id: 13,
    name: "A-Plus Copy Paper (Substance 24) - A4",
    description: "Paper - Copy24 | Brand: A-Plus | SKU: PAP-000010",
    price: 151.4,
    category: "Paper Products",
    stock: 88,
  },
  {
    id: 14,
    name: "A-Plus Copy Paper (Substance 24) - Legal",
    description: "Paper - Copy24 | Brand: A-Plus | SKU: PAP-000011",
    price: 172.5,
    category: "Paper Products",
    stock: 72,
  },
  {
    id: 15,
    name: "A-Plus Copy Paper (Substance 24) - Letter",
    description: "Paper - Copy24 | Brand: A-Plus | SKU: PAP-000012",
    price: 146,
    category: "Paper Products",
    stock: 98,
  },
  {
    id: 16,
    name: "Advance A+ Neon Notes - Composition Notebook",
    description: "Brand: Advance | SKU: NTB-000001",
    price: 15.75,
    category: "Notebooks",
    stock: 200,
  },
  {
    id: 17,
    name: "Advance Adventure Time - Composition Notebook",
    description: "Brand: Advance | SKU: NTB-000002",
    price: 16.25,
    category: "Notebooks",
    stock: 150,
  },
  {
    id: 18,
    name: "Advance Batman - Composition Notebook",
    description: "Brand: Advance | SKU: NTB-000003",
    price: 16.25,
    category: "Notebooks",
    stock: 180,
  },
  {
    id: 19,
    name: "Advance Color Blast - Composition Notebook",
    description: "Brand: Advance | SKU: NTB-000004",
    price: 15.75,
    category: "Notebooks",
    stock: 165,
  },
  {
    id: 20,
    name: "Advance Color Coding - Composition Notebook",
    description: "Brand: Advance | SKU: NTB-000005",
    price: 15.75,
    category: "Notebooks",
    stock: 175,
  },
  {
    id: 21,
    name: "Advance Funny Faces - Composition Notebook",
    description: "Brand: Advance | SKU: NTB-000006",
    price: 15.75,
    category: "Notebooks",
    stock: 190,
  },
  {
    id: 22,
    name: "Advance Neon Calypso - Composition Notebook",
    description: "Brand: Advance | SKU: NTB-000007",
    price: 15.75,
    category: "Notebooks",
    stock: 155,
  },
  {
    id: 23,
    name: "Advance Superman - Composition Notebook",
    description: "Brand: Advance | SKU: NTB-000008",
    price: 16.25,
    category: "Notebooks",
    stock: 145,
  },
  {
    id: 24,
    name: "Advance We Bare Bears - Composition Notebook",
    description: "Brand: Advance | SKU: NTB-000009",
    price: 16.25,
    category: "Notebooks",
    stock: 170,
  },
  {
    id: 25,
    name: "Easywrite K-12 - Composition Notebook",
    description: "Brand: Easywrite | SKU: NTB-000010",
    price: 21.75,
    category: "Notebooks",
    stock: 130,
  },
  {
    id: 26,
    name: "Easywrite Premium Notes - Composition Notebook",
    description: "Brand: Easywrite | SKU: NTB-000011",
    price: 17.5,
    category: "Notebooks",
    stock: 140,
  },
  {
    id: 27,
    name: "Advance A+ Neon Notes - Writing Notebook",
    description: "Brand: Advance | SKU: NTB-000012",
    price: 15.75,
    category: "Notebooks",
    stock: 185,
  },
]

const ITEMS_PER_PAGE_GRID = 9
const ITEMS_PER_PAGE_TABLE = 18
const categories = ["All", "Paper Products", "Storage Solutions", "Notebooks"]
const sortOptions = ["Newest", "Price: Low to High", "Price: High to Low"]

interface CartItem extends Product {
  quantity: number
}

interface QuotationData {
  id: string
  timestamp: string
  quoteNo: string
  client: string
  requestedBy: string
  department: string
  items: CartItem[]
  dateRequired: Date | undefined
  status: string
  version?: number
  parent_id?: string | null
}

interface PRFormData {
  timestamp: string
  quoteNo: string
  client: string
  requestedBy: string
  department: string
  items: CartItem[]
  dateRequired: Date | undefined
  status: string
}

export default function Quotation() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedSort, setSelectedSort] = useState("Newest")
  const [currentPage, setCurrentPage] = useState(1)
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("products")
  const [viewMode, setViewMode] = useState<"grid" | "table">("table")
  const [editMode, setEditMode] = useState(false)
  const [editingQuotation, setEditingQuotation] = useState<QuotationData | null>(null)

  // PR Form state
  const [prFormData, setPrFormData] = useState<PRFormData>({
    timestamp: new Date().toISOString().split('T')[0],
    quoteNo: "",
    client: "",
    requestedBy: "",
    department: "",
    items: [],
    dateRequired: undefined,
    status: "Pending",
  })
  const [submittedForms, setSubmittedForms] = useState<PRFormData[]>([])
  const [savedQuotations, setSavedQuotations] = useState<QuotationData[]>([
    // Sample quotation
    {
      id: "QUO-1730000000000",
      timestamp: new Date("2025-01-15T10:30:00").toISOString(),
      quoteNo: "RFQ25-0001",
      client: "Kingland Construction Corp.",
      requestedBy: "Katrina Malabanan",
      department: "Operations",
      items: [
        {
          id: 1,
          name: "Hard Copy Paper (Substance 20) - A4",
          description: "Paper - Copy20 | Brand: Advance | SKU: PAP-000001",
          price: 163,
          category: "Paper Products",
          stock: 100,
          quantity: 50,
        },
        {
          id: 16,
          name: "Advance A+ Neon Notes - Composition Notebook",
          description: "Brand: Advance | SKU: NTB-000001",
          price: 15.75,
          category: "Notebooks",
          stock: 200,
          quantity: 100,
        },
        {
          id: 7,
          name: "ADVANCE BALIKBAYAN BOX (20X20X20 IN) - BROWN",
          description: "Box - Balikbayan | Brand: Advance | SKU: STG-000001",
          price: 103,
          category: "Storage Solutions",
          stock: 50,
          quantity: 25,
        },
      ],
      dateRequired: new Date("2025-02-01"),
      status: "Saved",
      version: 1,
      parent_id: null,
    }
  ])
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationData | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set())

  // Generate next quote number based on most recent quotation
  const generateNextQuoteNumber = (): string => {
    const currentYear = new Date().getFullYear()
    const yearSuffix = currentYear.toString().slice(-2) // Get last 2 digits of year

    if (savedQuotations.length === 0) {
      return `RFQ${yearSuffix}-0001`
    }

    // Get the most recent quote number
    const latestQuote = savedQuotations[savedQuotations.length - 1]
    const match = latestQuote.quoteNo.match(/RFQ(\d{2})-(\d{4})/)

    if (match) {
      const year = parseInt(match[1])
      let number = parseInt(match[2])

      // If it's a new year, reset to 0001, otherwise increment
      if (year === parseInt(yearSuffix)) {
        number += 1
      } else {
        number = 1
      }

      return `RFQ${yearSuffix}-${number.toString().padStart(4, '0')}`
    }

    // Fallback
    return `RFQ${yearSuffix}-0001`
  }

  // Load cart items into PR form when switching to PR Form tab
  const loadCartIntoPRForm = () => {
    setPrFormData((prev) => ({
      ...prev,
      quoteNo: generateNextQuoteNumber(),
      items: [...cart],
    }))
  }

  // Reset to page 1 when switching view modes
  useEffect(() => {
    setCurrentPage(1)
  }, [viewMode])

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let products = mockProducts

    // Filter by search
    if (searchQuery) {
      products = products.filter(
        (product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by category
    if (selectedCategory !== "All") {
      products = products.filter((product) => product.category === selectedCategory)
    }

    // Sort products
    switch (selectedSort) {
      case "Price: Low to High":
        products = [...products].sort((a, b) => a.price - b.price)
        break
      case "Price: High to Low":
        products = [...products].sort((a, b) => b.price - a.price)
        break
      default:
        break
    }

    return products
  }, [searchQuery, selectedCategory, selectedSort])

  // Pagination - adjust based on view mode
  const itemsPerPage = viewMode === "grid" ? ITEMS_PER_PAGE_GRID : ITEMS_PER_PAGE_TABLE
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleAddToOrder = (product: Product, qty: number = 1) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id)
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + qty } : item
        )
      }
      return [...prevCart, { ...product, quantity: qty }]
    })
  }

  const handleIncrementQuantity = (productId: number) => {
    const product = mockProducts.find(p => p.id === productId)
    if (product) {
      handleAddToOrder(product, 1)
    }
  }

  const handleDecrementQuantity = (productId: number) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === productId)
      if (!existingItem) return prevCart

      if (existingItem.quantity <= 1) {
        return prevCart.filter((item) => item.id !== productId)
      }

      return prevCart.map((item) =>
        item.id === productId ? { ...item, quantity: item.quantity - 1 } : item
      )
    })
  }

  const getCartQuantity = (productId: number): number => {
    const item = cart.find((item) => item.id === productId)
    return item ? item.quantity : 0
  }

  const handleUpdateQuantity = (productId: number, quantity: number) => {
    if (quantity < 1) return
    setCart((prevCart) =>
      prevCart.map((item) => (item.id === productId ? { ...item, quantity } : item))
    )
  }

  const handleRemoveItem = (productId: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId))
  }

  const handleSubmit = () => {
    loadCartIntoPRForm()
    setActiveTab("form")
    setIsCartOpen(false)
  }

  // PR Form handlers
  const handlePRFormChange = (field: keyof PRFormData, value: string | number | CartItem[] | Date | undefined) => {
    setPrFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSaveQuotation = () => {
    // Clear previous errors
    setFieldErrors(new Set())

    // Validate items
    if (prFormData.items.length === 0) {
      toast.error("No items in cart", {
        description: "Please add items to cart before saving quotation"
      })
      return
    }

    // Validate required fields
    const errors = new Set<string>()
    if (!prFormData.quoteNo) errors.add("quoteNo")
    if (!prFormData.client) errors.add("client")
    if (!prFormData.requestedBy) errors.add("requestedBy")
    if (!prFormData.department) errors.add("department")
    if (!prFormData.dateRequired) errors.add("dateRequired")

    if (errors.size > 0) {
      setFieldErrors(errors)
      toast.error("Missing required fields", {
        description: "Please fill in all required fields highlighted in red"
      })
      return
    }

    const newQuotation: QuotationData = {
      id: `QUO-${Date.now()}`,
      timestamp: new Date().toISOString(),
      quoteNo: prFormData.quoteNo,
      client: prFormData.client,
      requestedBy: prFormData.requestedBy,
      department: prFormData.department,
      items: [...prFormData.items],
      dateRequired: prFormData.dateRequired,
      status: "Saved",
      version: 1,
      parent_id: null,
    }

    setSavedQuotations((prev) => [...prev, newQuotation])

    // Reset form and cart
    setPrFormData({
      timestamp: new Date().toISOString().split('T')[0],
      quoteNo: "",
      client: "",
      requestedBy: "",
      department: "",
      items: [],
      dateRequired: undefined,
      status: "Pending",
    })
    setCart([])
    setFieldErrors(new Set())

    toast.success("Quotation saved successfully!", {
      description: `Quote No: ${newQuotation.quoteNo}`
    })
    setActiveTab("list")
  }

  const handleEditQuotation = (quotation: QuotationData) => {
    // Set edit mode
    setEditMode(true)
    setEditingQuotation(quotation)

    // Pre-fill form data
    setPrFormData({
      timestamp: quotation.timestamp,
      quoteNo: quotation.quoteNo,
      client: quotation.client,
      requestedBy: quotation.requestedBy,
      department: quotation.department,
      items: [...quotation.items],
      dateRequired: quotation.dateRequired,
      status: quotation.status,
    })

    // Pre-fill cart
    setCart([...quotation.items])

    // Switch to quotation tab
    setActiveTab("form")

    toast.info("Edit mode activated", {
      description: `Editing ${quotation.quoteNo}`
    })
  }

  const handleUpdateQuotation = () => {
    if (!editingQuotation) return

    // Clear previous errors
    setFieldErrors(new Set())

    // Validate items
    if (prFormData.items.length === 0) {
      toast.error("No items in cart", {
        description: "Please add items to cart before updating quotation"
      })
      return
    }

    // Validate required fields
    const errors = new Set<string>()
    if (!prFormData.quoteNo) errors.add("quoteNo")
    if (!prFormData.client) errors.add("client")
    if (!prFormData.requestedBy) errors.add("requestedBy")
    if (!prFormData.department) errors.add("department")
    if (!prFormData.dateRequired) errors.add("dateRequired")

    if (errors.size > 0) {
      setFieldErrors(errors)
      toast.error("Missing required fields", {
        description: "Please fill in all required fields highlighted in red"
      })
      return
    }

    // Update the quotation
    const updatedQuotation: QuotationData = {
      ...editingQuotation,
      quoteNo: prFormData.quoteNo,
      client: prFormData.client,
      requestedBy: prFormData.requestedBy,
      department: prFormData.department,
      items: [...prFormData.items],
      dateRequired: prFormData.dateRequired,
    }

    setSavedQuotations((prev) =>
      prev.map((q) => (q.id === editingQuotation.id ? updatedQuotation : q))
    )

    // Exit edit mode
    handleCancelEdit()

    toast.success("Quotation updated successfully!", {
      description: `Quote No: ${updatedQuotation.quoteNo}`
    })
    setActiveTab("list")
  }

  const handleSaveVersion = () => {
    if (!editingQuotation) return

    // Determine parent_id and version number
    const parent_id = editingQuotation.parent_id || editingQuotation.id
    const baseQuoteNo = editingQuotation.quoteNo.split('.')[0] // Get base quote number without version suffix

    // Count existing versions for this parent
    const existingVersions = savedQuotations.filter(
      q => q.parent_id === parent_id || q.id === parent_id
    )
    const nextVersionNumber = existingVersions.length + 1

    // Create version suffix for quote number
    const versionedQuoteNo = `${baseQuoteNo}.${nextVersionNumber}`

    // Create new version
    const newVersion: QuotationData = {
      id: `QUO-${Date.now()}`,
      timestamp: new Date().toISOString(),
      quoteNo: versionedQuoteNo,
      client: prFormData.client,
      requestedBy: prFormData.requestedBy,
      department: prFormData.department,
      items: [...prFormData.items],
      dateRequired: prFormData.dateRequired,
      status: "Saved",
      version: nextVersionNumber,
      parent_id: parent_id,
    }

    setSavedQuotations((prev) => [...prev, newVersion])

    // Update editing reference to new version
    setEditingQuotation(newVersion)

    toast.success("New version saved!", {
      description: `Created version ${nextVersionNumber} (${versionedQuoteNo})`
    })
  }

  const handleExportQuotation = (format: "pdf" | "excel") => {
    if (!editingQuotation) return

    // Save as version first
    handleSaveVersion()

    // Then export
    setTimeout(() => {
      toast.success(`Exporting as ${format.toUpperCase()}...`, {
        description: "Version saved and export initiated"
      })
      // TODO: Implement actual export functionality
    }, 500)
  }

  const handleCancelEdit = () => {
    setEditMode(false)
    setEditingQuotation(null)

    // Reset form and cart
    setPrFormData({
      timestamp: new Date().toISOString().split('T')[0],
      quoteNo: "",
      client: "",
      requestedBy: "",
      department: "",
      items: [],
      dateRequired: undefined,
      status: "Pending",
    })
    setCart([])
    setFieldErrors(new Set())

    setActiveTab("list")
    toast.info("Edit cancelled")
  }

  const handlePRFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (prFormData.items.length === 0) {
      alert("Please add items to cart before submitting a purchase request")
      return
    }

    const newForm = {
      ...prFormData,
      timestamp: new Date().toISOString(),
    }
    setSubmittedForms((prev) => [...prev, newForm])
    // Reset form and cart
    setPrFormData({
      timestamp: new Date().toISOString().split('T')[0],
      quoteNo: "",
      client: "",
      requestedBy: "",
      department: "",
      items: [],
      dateRequired: undefined,
      status: "Pending",
    })
    setCart([])
    alert("Purchase Request submitted successfully!")
    setActiveTab("products")
  }

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  // Calculate all financial metrics based on Philippine tax regulations
  const calculateProfitMargin = () => {
    let totalInternal = 0
    let totalProposal = 0
    
    document.querySelectorAll('[data-internal-price]').forEach((priceEl) => {
      const itemId = priceEl.getAttribute('data-item-id')
      const internalPrice = parseFloat((priceEl as HTMLInputElement).value || '0')
      const qtyInput = document.getElementById(`quantity-${itemId}`) as HTMLInputElement
      const proposalInput = document.getElementById(`proposal-price-${itemId}`) as HTMLInputElement
      
      if (qtyInput && proposalInput) {
        const qty = parseFloat(qtyInput.value || '0')
        totalInternal += internalPrice * qty
        totalProposal += parseFloat(proposalInput.value || '0') * qty
      }
    })
    
    const VAT_RATE = 0.12 // 12% VAT in Philippines
    const INCOME_TAX_RATE = 0.25 // 25% Income Tax
    const EWT_RATE = 0.01 // 1% for goods, 2% for services (using 1% as default)
    const CONTINGENCY_RATE = 0.05 // 5% contingency
    
    // VAT Calculations
    const totalBidPrice = totalProposal // Total Bid Price (VAT-inclusive)
    const vatExcludedSales = totalBidPrice / (1 + VAT_RATE) // VAT-excluded Sales Revenue
    const outputVat = totalBidPrice - vatExcludedSales // Output VAT
    
    const totalCost = totalInternal // Total Cost (VAT-inclusive)
    const vatExcludedCost = totalCost / (1 + VAT_RATE) // VAT-excluded Cost
    const inputVat = totalCost - vatExcludedCost // Input VAT
    
    // Tax Calculations
    const vatPayable = outputVat - inputVat // VAT Payable to BIR
    const grossProfit = vatExcludedSales - vatExcludedCost // Gross Profit
    const ewtAmount = vatExcludedSales * EWT_RATE // Expanded Withholding Tax
    const incomeTax25 = grossProfit * INCOME_TAX_RATE // Income Tax @ 25%
    const finalIncomeTax = Math.max(0, incomeTax25 - ewtAmount) // Final Income Tax (Less EWT Credit)
    
    // Profit Calculations
    const netProfit = grossProfit - finalIncomeTax // Net Profit (Gross Profit - Final Income Tax)
    const contingencyAmount = totalCost * CONTINGENCY_RATE // Contingency (5% of cost)
    const finalNetProfit = netProfit - contingencyAmount // Final Net Profit
    
    // Loan Calculations
    const loanInterestInput = document.getElementById('loan-interest-input') as HTMLInputElement
    const loanMonthsInput = document.getElementById('loan-months-input') as HTMLInputElement
    const loanInterest = parseFloat(loanInterestInput?.value || '0') / 100
    const loanMonths = parseFloat(loanMonthsInput?.value || '0')
    const loanAmount = totalCost * loanInterest * (loanMonths / 12)
    const netProfitWithLoan = finalNetProfit - loanAmount
    
    // Profit Margin
    const netProfitMargin = totalInternal > 0 ? (netProfit / totalInternal) * 100 : 0
    
    // Update all display elements
    const updateEl = (id: string, value: number, isPercent = false) => {
      const el = document.getElementById(id)
      if (el) {
        if (isPercent) {
          el.textContent = value.toFixed(2) + '%'
        } else {
          el.textContent = '₱' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        }
      }
    }
    
    // Bid Price Section
    updateEl('total-bid-price', totalBidPrice)
    updateEl('vat-excluded-sales', vatExcludedSales)
    updateEl('output-vat', outputVat)
    
    // Cost Section
    updateEl('total-cost-vat', totalCost)
    updateEl('vat-excluded-cost', vatExcludedCost)
    updateEl('input-vat', inputVat)
    
    // Tax Summary
    updateEl('vat-payable', vatPayable)
    updateEl('gross-profit', grossProfit)
    updateEl('ewt-amount', ewtAmount)
    
    // Tax & Contingency
    updateEl('income-tax-25', incomeTax25)
    updateEl('final-income-tax', finalIncomeTax)
    updateEl('net-profit-before-cont', netProfit)
    updateEl('contingency-amount', contingencyAmount)
    updateEl('final-net-profit', finalNetProfit)
    
    // Profit Margin
    updateEl('profit-margin-display', netProfitMargin, true)
    
    // Loan Calculations
    updateEl('loan-amount', loanAmount)
    updateEl('net-profit-with-loan', netProfitWithLoan)
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden pb-12">
      {/* Header */}
      <div className="w-full p-6 border-b">
        <div className="flex flex-col items-start justify-start mb-4">
          <div>
            <h1 className="text-3xl font-semibold">Quotation Management</h1>
          </div>

          {/* Tabs */}
          <div className="flex flex-row w-full justify-start gap-1 pt-4 border-b border-border">
            <Button
              variant='tab'
              className={`flex w-32 h-9 items-center justify-center text-sm font-medium transition-colors rounded-t-md ${
                activeTab === "products"
                  ? "text-foreground border-b-2 border-primary bg-muted"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
              onClick={() => setActiveTab("products")}
            >
              Products
            </Button>
            <Button
              variant='tab'
              className={`flex w-32 h-9 items-center justify-center text-sm font-medium transition-colors rounded-t-md ${
                activeTab === "form"
                  ? "text-foreground border-b-2 border-primary bg-muted"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
              onClick={() => {
                setActiveTab("form")
                loadCartIntoPRForm()
              }}
            >
              New Quotation
            </Button>
            <Button
              variant='tab'
              className={`flex w-32 h-9 items-center justify-center text-sm font-medium transition-colors rounded-t-md ${
                activeTab === "list"
                  ? "text-foreground border-b-2 border-primary bg-muted"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
              onClick={() => setActiveTab("list")}
            >
              Quotations
            </Button>
          </div>
        </div>
        {/* Products Header */}
        {activeTab === "products" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-semibold">Create New Quotation</h1>
              </div>
              <Button
                variant="default"
                className="gap-2"
                onClick={() => setIsCartOpen(true)}
              >
                <ShoppingCart className="h-5 w-5" />
                <span>View Order</span>
                {totalItems > 0 && (
                  <span className="bg-white text-blue-500 rounded-full px-2 py-0.5 text-xs font-bold">
                    {totalItems}
                  </span>
                )}
              </Button>
            </div>
              
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-9"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    {selectedCategory}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {categories.map((category) => (
                    <DropdownMenuItem
                      key={category}
                      onSelect={() => {
                        setSelectedCategory(category)
                        setCurrentPage(1)
                      }}
                    >
                      {category}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">Sort: {selectedSort}</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {sortOptions.map((option) => (
                    <DropdownMenuItem key={option} onSelect={() => setSelectedSort(option)}>
                      {option}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* View Toggle */}
              <div className="flex gap-1 border rounded-md">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  className="rounded-r-none"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("table")}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* PR Form Header */}
        {activeTab === "form" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-semibold">New Quotation</h1>
            </div>
          </>
        )}

        {/* Quotations List Header */}
        {activeTab === "list" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-semibold">Saved Quotations</h1>
            </div>
          </>
        )}

      </div>

      {/* Products View */}
      {activeTab === "products" && (
        <>
        <div className="p-6">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-500 text-lg">No products found</p>
            </div>
          ) : (
            <>
              {/* Grid View */}
              {viewMode === "grid" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {paginatedProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={handleAddToOrder}
                    />
                  ))}
                </div>
              )}

              {/* Table View */}
              {viewMode === "table" && (
                <div className="border rounded-lg overflow-hidden mb-8">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium">SKU</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Product Name</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Brand</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Price</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Stock</th>
                          <th className="px-4 py-3 text-center text-sm font-medium">Quantity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedProducts.map((product) => {
                          const itemCode = product.description.match(/SKU: ([A-Z0-9-]+)/)?.[1] || "N/A"
                          const brand = product.description.match(/Brand: ([^|]+)/)?.[1]?.trim() || "N/A"
                          const cartQty = getCartQuantity(product.id)

                          return (
                            <tr key={product.id} className="border-t hover:bg-muted/50">
                              <td className="px-4 py-3 text-sm font-mono">{itemCode}</td>
                              <td className="px-4 py-3 text-sm font-medium">{product.name}</td>
                              <td className="px-4 py-3 text-sm">{brand}</td>
                              <td className="px-4 py-3 text-sm">{product.category}</td>
                              <td className="px-4 py-3 text-sm font-medium">₱{product.price.toFixed(2)}</td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`${product.stock < 20 ? 'text-red-500' : 'text-green-600'}`}>
                                  {product.stock}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-2">
                                  {cartQty > 0 ? (
                                    <>
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        className="h-8 w-8"
                                        onClick={() => handleDecrementQuantity(product.id)}
                                      >
                                        <Minus className="h-4 w-4" />
                                      </Button>
                                      <span className="w-8 text-center font-medium">{cartQty}</span>
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        className="h-8 w-8"
                                        onClick={() => handleIncrementQuantity(product.id)}
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                    </>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() => handleAddToOrder(product, 1)}
                                    >
                                      <Plus className="h-4 w-4 mr-1" />
                                      Add
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )}
        </div>

        </>
      )}

      {/* PR Form */}
      {activeTab === "form" && (
        <div className="p-6">
          {editMode && editingQuotation && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-900">Edit Mode</p>
                  <p className="text-sm text-blue-700">
                    Editing {editingQuotation.quoteNo} - {editingQuotation.status}
                  </p>
                </div>
              </div>
            </div>
          )}
          <form onSubmit={handlePRFormSubmit} className="space-y-6">
            {/* Basic Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Quote No. */}
              <div className="space-y-2">
                <label htmlFor="quoteNo" className="text-sm font-medium">
                  Quote No. <span className="text-red-500">*</span>
                </label>
                <Input
                  id="quoteNo"
                  value={prFormData.quoteNo}
                  onChange={(e) => {
                    handlePRFormChange("quoteNo", e.target.value)
                    setFieldErrors(prev => {
                      const next = new Set(prev)
                      next.delete("quoteNo")
                      return next
                    })
                  }}
                  placeholder="Enter quote number"
                  className={fieldErrors.has("quoteNo") ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
              </div>

              {/* Client */}
              <div className="space-y-2">
                <label htmlFor="client" className="text-sm font-medium">
                  Client <span className="text-red-500">*</span>
                </label>
                <Input
                  id="client"
                  value={prFormData.client}
                  onChange={(e) => {
                    handlePRFormChange("client", e.target.value)
                    setFieldErrors(prev => {
                      const next = new Set(prev)
                      next.delete("client")
                      return next
                    })
                  }}
                  placeholder="Enter client name"
                  className={fieldErrors.has("client") ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
              </div>

              {/* Requested By */}
              <div className="space-y-2">
                <label htmlFor="requestedBy" className="text-sm font-medium">
                  Requested By <span className="text-red-500">*</span>
                </label>
                <Input
                  id="requestedBy"
                  value={prFormData.requestedBy}
                  onChange={(e) => {
                    handlePRFormChange("requestedBy", e.target.value)
                    setFieldErrors(prev => {
                      const next = new Set(prev)
                      next.delete("requestedBy")
                      return next
                    })
                  }}
                  placeholder="Enter requester name"
                  className={fieldErrors.has("requestedBy") ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
              </div>

              {/* Department */}
              <div className="space-y-2">
                <label htmlFor="department" className="text-sm font-medium">
                  Department <span className="text-red-500">*</span>
                </label>
                <Input
                  id="department"
                  value={prFormData.department}
                  onChange={(e) => {
                    handlePRFormChange("department", e.target.value)
                    setFieldErrors(prev => {
                      const next = new Set(prev)
                      next.delete("department")
                      return next
                    })
                  }}
                  placeholder="Enter department"
                  className={fieldErrors.has("department") ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
              </div>

              {/* Date Required */}
              <div className="space-y-2">
                <label htmlFor="dateRequired" className="text-sm font-medium">
                  Date Required <span className="text-red-500">*</span>
                </label>
                <div className={fieldErrors.has("dateRequired") ? "border-2 border-red-500 rounded-md" : ""}>
                  <DatePicker
                    date={prFormData.dateRequired}
                    onSelect={(date) => {
                      handlePRFormChange("dateRequired", date)
                      setFieldErrors(prev => {
                        const next = new Set(prev)
                        next.delete("dateRequired")
                        return next
                      })
                    }}
                    placeholder="Select required date"
                  />
                </div>
              </div>

              {/* Approved Budget Cost */}
              <div className="space-y-2">
                <label htmlFor="approvedBudget" className="text-sm font-medium">
                  Approved Budget Cost (ABC) <span className="text-red-500">*</span>
                </label>
                <Input
                  id="approved-budget-input"
                  type="number"
                  placeholder="Enter approved budget"
                  defaultValue="0"
                  onChange={(e) => {
                    // Recalculate when approved budget changes
                    calculateProfitMargin()
                  }}
                />
              </div>
            </div>

            {/* Quotation Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/30 rounded-lg">
              <div className="space-y-2">
                <label className="text-sm font-medium">Bid Percentage (Markup %)</label>
                <Input
                  id="bid-percentage-input"
                  type="number"
                  placeholder="40"
                  defaultValue="40"
                  onChange={(e) => {
                    // Update all proposal prices when bid percentage changes
                    const bidPercentage = parseFloat(e.target.value) || 0
                    document.querySelectorAll('[data-internal-price]').forEach((priceEl) => {
                      const itemId = priceEl.getAttribute('data-item-id')
                      const internalPrice = parseFloat((priceEl as HTMLInputElement).value || '0')
                      const proposalPrice = internalPrice * (1 + bidPercentage / 100)
                      const proposalInput = document.getElementById(`proposal-price-${itemId}`) as HTMLInputElement
                      const qtyInput = document.getElementById(`quantity-${itemId}`) as HTMLInputElement
                      const totalEl = document.getElementById(`total-amount-${itemId}`)
                      
                      if (proposalInput) {
                        proposalInput.value = proposalPrice.toFixed(2)
                        
                        // Update total
                        if (totalEl && qtyInput) {
                          const qty = parseFloat(qtyInput.value || '1')
                          totalEl.textContent = (proposalPrice * qty).toFixed(2)
                        }
                      }
                    })
                    // Recalculate profit margin
                    calculateProfitMargin()
                  }}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Supplier Price VAT Inclusive?</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            </div>

            {/* Cart Items Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Items / Products</h3>
                {prFormData.items.length === 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("products")}
                  >
                    Add Products
                  </Button>
                )}
              </div>

              {prFormData.items.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          {/* Product Details Group */}
                          <th colSpan={4} className="px-3 py-2 text-left text-xs font-semibold border-r-2 border-border bg-slate-100">
                            PRODUCT DETAILS
                          </th>
                          {/* Internal Pricing Group */}
                          <th colSpan={3} className="px-3 py-2 text-left text-xs font-semibold border-r-2 border-border bg-amber-50">
                            INTERNAL PRICING
                          </th>
                          {/* External/Client Pricing Group */}
                          <th colSpan={4} className="px-3 py-2 text-left text-xs font-semibold bg-blue-50">
                            CLIENT PRICING
                          </th>
                          <th className="px-3 py-2 text-center text-xs font-semibold"></th>
                        </tr>
                        <tr>
                          {/* Product Details */}
                          <th className="px-3 py-3 text-left text-xs font-medium border-r">Item Code</th>
                          <th className="px-3 py-3 text-left text-xs font-medium">Name</th>
                          <th className="px-3 py-3 text-left text-xs font-medium">Description</th>
                          <th className="px-3 py-3 text-left text-xs font-medium border-r-2 border-border">Brand</th>
                          
                          {/* Internal Pricing */}
                          <th className="px-3 py-3 text-left text-xs font-medium bg-amber-50/30">Internal Price</th>
                          <th className="px-3 py-3 text-left text-xs font-medium bg-amber-50/30">Supplier</th>
                          <th className="px-3 py-3 text-left text-xs font-medium border-r-2 border-border bg-amber-50/30">Amount to Pay</th>
                          
                          {/* External/Client Pricing */}
                          <th className="px-3 py-3 text-left text-xs font-medium bg-blue-50/30">ABC Price</th>
                          <th className="px-3 py-3 text-left text-xs font-medium bg-blue-50/30">Quantity</th>
                          <th className="px-3 py-3 text-left text-xs font-medium bg-blue-50/30">Proposal Price</th>
                          <th className="px-3 py-3 text-left text-xs font-medium bg-blue-50/30">Total Amount</th>
                          
                          <th className="px-3 py-3 text-center text-xs font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prFormData.items.map((item, index) => {
                          const itemCode = item.description.match(/SKU: ([A-Z0-9-]+)/)?.[1] || "N/A"
                          const brand = item.description.match(/Brand: ([^|]+)/)?.[1]?.trim() || "N/A"
                          const description = item.description.split('|')[0]?.trim() || item.category
                          const basePrice = (item.price * 0.85).toFixed(2) // Placeholder: base supplier price
                          const abcPrice = item.price // ABC price is the original product price
                          
                          // Supplier prices (placeholder data)
                          const supplierPrices = {
                            ofps: parseFloat(basePrice),
                            shopee: parseFloat(basePrice) * 1.05,
                            plim: parseFloat(basePrice) * 1.08,
                          }
                          
                          // Calculate proposal price with default 40% markup on internal price
                          const defaultBidPercentage = 40
                          const initialProposalPrice = supplierPrices.ofps * (1 + defaultBidPercentage / 100)
                          const total = initialProposalPrice * item.quantity
                          
                          return (
                            <tr key={index} className="border-t hover:bg-muted/50">
                              {/* Product Details */}
                              <td className="px-3 py-3 border-r">
                                <span className="text-xs font-mono">{itemCode}</span>
                          </td>
                              <td className="px-3 py-3">
                                <span className="text-xs font-medium">{item.name}</span>
                              </td>
                              <td className="px-3 py-3">
                                <span className="text-xs text-muted-foreground">{description}</span>
                              </td>
                              <td className="px-3 py-3 border-r-2 border-border">
                                <span className="text-xs">{brand}</span>
                              </td>
                              
                              {/* Internal Pricing */}
                              <td className="px-3 py-3 bg-amber-50/20">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-medium">₱</span>
                                  <Input
                                    id={`internal-price-${item.id}`}
                                    data-internal-price
                                    data-item-id={item.id}
                                    type="number"
                                    className="h-8 text-xs w-24 font-medium"
                                    defaultValue={supplierPrices.ofps.toFixed(2)}
                                    placeholder="0.00"
                                    onChange={(e) => {
                                      // Update proposal price based on new internal price + bid percentage
                                      const newInternalPrice = parseFloat(e.target.value || '0')
                                      const bidInput = document.getElementById('bid-percentage-input') as HTMLInputElement
                                      const bidPercentage = parseFloat(bidInput?.value || '40')
                                      const proposalInput = document.getElementById(`proposal-price-${item.id}`) as HTMLInputElement
                                      const qtyInput = document.getElementById(`quantity-${item.id}`) as HTMLInputElement
                                      const totalEl = document.getElementById(`total-amount-${item.id}`)
                                      const internalAmountEl = document.getElementById(`internal-amount-${item.id}`)
                                      
                                      // Update internal amount to pay
                                      if (internalAmountEl && qtyInput) {
                                        const qty = parseFloat(qtyInput.value || '1')
                                        internalAmountEl.textContent = (newInternalPrice * qty).toFixed(2)
                                      }
                                      
                                      if (proposalInput) {
                                        const newProposalPrice = newInternalPrice * (1 + bidPercentage / 100)
                                        proposalInput.value = newProposalPrice.toFixed(2)
                                        
                                        // Update total
                                        if (totalEl && qtyInput) {
                                          const qty = parseFloat(qtyInput.value || '1')
                                          totalEl.textContent = (newProposalPrice * qty).toFixed(2)
                                        }
                                      }
                                      
                                      // Recalculate profit margin when internal price changes
                                      calculateProfitMargin()
                                    }}
                                  />
                                </div>
                              </td>
                              <td className="px-3 py-3 bg-amber-50/20">
                                <select 
                                  className="h-8 text-xs w-full rounded-md border border-input bg-background px-2"
                                  onChange={(e) => {
                                    const selectedSupplier = e.target.value as keyof typeof supplierPrices
                                    const newInternalPrice = supplierPrices[selectedSupplier]
                                    const priceInput = document.getElementById(`internal-price-${item.id}`) as HTMLInputElement
                                    const bidInput = document.getElementById('bid-percentage-input') as HTMLInputElement
                                    const bidPercentage = parseFloat(bidInput?.value || '40')
                                    const proposalInput = document.getElementById(`proposal-price-${item.id}`) as HTMLInputElement
                                    const qtyInput = document.getElementById(`quantity-${item.id}`) as HTMLInputElement
                                    const totalEl = document.getElementById(`total-amount-${item.id}`)
                                    const internalAmountEl = document.getElementById(`internal-amount-${item.id}`)
                                    
                                    if (priceInput) {
                                      priceInput.value = newInternalPrice.toFixed(2)
                                    }
                                    
                                    // Update internal amount to pay
                                    if (internalAmountEl && qtyInput) {
                                      const qty = parseFloat(qtyInput.value || '1')
                                      internalAmountEl.textContent = (newInternalPrice * qty).toFixed(2)
                                    }
                                    
                                    // Update proposal price based on new internal price + bid percentage
                                    if (proposalInput) {
                                      const newProposalPrice = newInternalPrice * (1 + bidPercentage / 100)
                                      proposalInput.value = newProposalPrice.toFixed(2)
                                      
                                      // Update total
                                      if (totalEl && qtyInput) {
                                        const qty = parseFloat(qtyInput.value || '1')
                                        totalEl.textContent = (newProposalPrice * qty).toFixed(2)
                                      }
                                    }
                                    
                                    // Recalculate profit margin
                                    calculateProfitMargin()
                                  }}
                                >
                                  <option value="ofps">OFPS</option>
                                  <option value="shopee">Shopee</option>
                                  <option value="plim">P-lim</option>
                                </select>
                              </td>
                              <td className="px-3 py-3 border-r-2 border-border bg-amber-50/20">
                                <span id={`internal-amount-${item.id}`} className="text-xs font-bold">₱{(supplierPrices.ofps * item.quantity).toFixed(2)}</span>
                              </td>
                              
                              {/* External/Client Pricing */}
                              <td className="px-3 py-3 bg-blue-50/20">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-medium">₱</span>
                                  <Input
                                    id={`abc-price-${item.id}`}
                                    data-abc-price
                                    data-item-id={item.id}
                                    type="number"
                                    className="h-8 text-xs w-24"
                                    defaultValue={abcPrice.toFixed(2)}
                                    placeholder="0.00"
                                  />
                                </div>
                              </td>
                              <td className="px-3 py-3 bg-blue-50/20">
                                <Input
                                  id={`quantity-${item.id}`}
                                  type="number"
                                  className="h-8 text-xs w-16"
                                  defaultValue={item.quantity}
                                  onChange={(e) => {
                                    const qty = parseFloat(e.target.value || '0')
                                    const proposalInput = document.getElementById(`proposal-price-${item.id}`) as HTMLInputElement
                                    const totalEl = document.getElementById(`total-amount-${item.id}`)
                                    const internalPriceInput = document.getElementById(`internal-price-${item.id}`) as HTMLInputElement
                                    const internalAmountEl = document.getElementById(`internal-amount-${item.id}`)
                                    
                                    // Update internal amount to pay
                                    if (internalAmountEl && internalPriceInput) {
                                      const internalPrice = parseFloat(internalPriceInput.value || '0')
                                      internalAmountEl.textContent = (internalPrice * qty).toFixed(2)
                                    }
                                    
                                    if (proposalInput && totalEl) {
                                      const proposalPrice = parseFloat(proposalInput.value || '0')
                                      totalEl.textContent = (proposalPrice * qty).toFixed(2)
                                    }
                                    
                                    // Recalculate profit margin
                                    calculateProfitMargin()
                                  }}
                                />
                              </td>
                              <td className="px-3 py-3 bg-blue-50/20">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-medium">₱</span>
                                  <Input
                                    id={`proposal-price-${item.id}`}
                                    type="number"
                                    className="h-8 text-xs w-24 font-medium border-blue-300"
                                    defaultValue={initialProposalPrice.toFixed(2)}
                                    placeholder="0.00"
                                    onChange={(e) => {
                                      const proposalPrice = parseFloat(e.target.value || '0')
                                      const qtyInput = document.getElementById(`quantity-${item.id}`) as HTMLInputElement
                                      const totalEl = document.getElementById(`total-amount-${item.id}`)
                                      
                                      if (qtyInput && totalEl) {
                                        const qty = parseFloat(qtyInput.value || '1')
                                        totalEl.textContent = (proposalPrice * qty).toFixed(2)
                                      }
                                      
                                      // Recalculate profit margin
                                      calculateProfitMargin()
                                    }}
                                  />
                                </div>
                              </td>
                              <td className="px-3 py-3 bg-blue-50/20">
                                <span id={`total-amount-${item.id}`} className="text-xs font-bold">₱{total.toFixed(2)}</span>
                              </td>
                              
                              <td className="px-3 py-3 text-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-xs"
                                  onClick={() => handleRemoveItem(item.id)}
                                >
                                  ✕
                                </Button>
                          </td>
                        </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals Summary */}
                  <div className="border-t bg-muted/30 p-6">
                    {/* Main Financial Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6 pb-6 border-b">
                      {/* Total Bid Price Column */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">Bid Price (VAT-inclusive)</h4>
                        <div className="flex justify-between text-sm">
                          <span className="font-bold">Total Bid Price:</span>
                          <span id="total-bid-price" className="font-bold text-blue-600">₱0.00</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>VAT-excluded Sales Revenue:</span>
                          <span id="vat-excluded-sales">₱0.00</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Output VAT (12%):</span>
                          <span id="output-vat">₱0.00</span>
                        </div>
                      </div>

                      {/* Total Cost Column */}
                      <div className="space-y-2 border-l pl-6">
                        <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-3">Cost (VAT-inclusive)</h4>
                        <div className="flex justify-between text-sm">
                          <span className="font-bold">Total Cost:</span>
                          <span id="total-cost-vat" className="font-bold text-amber-600">₱0.00</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>VAT-excluded Cost:</span>
                          <span id="vat-excluded-cost">₱0.00</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Input VAT (12%):</span>
                          <span id="input-vat">₱0.00</span>
                        </div>
                      </div>

                      {/* Tax Summary Column */}
                      <div className="space-y-2 border-l pl-6">
                        <h4 className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-3">Tax Summary</h4>
                        <div className="flex justify-between text-xs">
                          <span>VAT Payable to BIR:</span>
                          <span id="vat-payable" className="font-medium">₱0.00</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>Gross Profit:</span>
                          <span id="gross-profit" className="font-medium">₱0.00</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>EWT (1% goods / 2% services):</span>
                          <span id="ewt-amount">₱0.00</span>
                        </div>
                      </div>
                    </div>

                    {/* Additional Calculations */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Left: Tax & Contingency */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Income Tax @ 25%:</span>
                          <span id="income-tax-25" className="font-medium">₱0.00</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Final Income Tax (Less EWT):</span>
                          <span id="final-income-tax" className="font-medium">₱0.00</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Net Profit (Gross - Tax):</span>
                          <span id="net-profit-before-cont" className="font-medium text-green-600">₱0.00</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Contingency Amount (5%):</span>
                          <span id="contingency-amount">₱0.00</span>
                        </div>
                        <div className="flex justify-between text-base font-bold pt-2 border-t">
                          <span>Final Net Profit:</span>
                          <span id="final-net-profit" className="text-green-600">₱0.00</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground pt-1">
                          <span>Profit Margin:</span>
                          <span id="profit-margin-display" className="font-bold text-green-600">0.00%</span>
                        </div>
                      </div>

                      {/* Right: Loan Calculations */}
                      <div className="space-y-2 border-l pl-6">
                        <div className="flex justify-between text-sm">
                          <span>Capital Loan % Interest:</span>
                          <div className="flex items-center gap-2">
                            <Input
                              id="loan-interest-input"
                              type="number"
                              className="h-7 w-16 text-xs text-right"
                              defaultValue="3"
                              onChange={() => calculateProfitMargin()}
                            />
                            <span className="text-xs">%</span>
                          </div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Number of Months:</span>
                          <Input
                            id="loan-months-input"
                            type="number"
                            className="h-7 w-16 text-xs text-right"
                            defaultValue="0"
                            onChange={() => calculateProfitMargin()}
                          />
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Loan Amount:</span>
                          <span id="loan-amount">₱0.00</span>
                        </div>
                        <div className="flex justify-between text-base font-bold pt-2 border-t">
                          <span>Net Profit (with Loan):</span>
                          <span id="net-profit-with-loan" className="text-green-600">₱0.00</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-8 text-center text-muted-foreground">
                  <p>No items added yet. Please add products from the Products tab.</p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              {editMode ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleUpdateQuotation}
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveVersion}
                  >
                    Save Version
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button">
                        <Download className="mr-2 h-4 w-4" />
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleExportQuotation("pdf")}>
                        Export as PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExportQuotation("excel")}>
                        Export as Excel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setPrFormData({
                        timestamp: new Date().toISOString().split('T')[0],
                        quoteNo: "",
                        client: "",
                        requestedBy: "",
                        department: "",
                        items: [],
                        dateRequired: undefined,
                        status: "Pending",
                      })
                      setCart([])
                    }}
                  >
                    Clear Form
                  </Button>
                  <Button type="button" onClick={handleSaveQuotation}>
                    Save Quotation
                  </Button>
                </>
              )}
            </div>
          </form>

          {/* Submitted Forms Table */}
          {submittedForms.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Submitted Purchase Requests</h2>
              <div className="space-y-6">
                {submittedForms.map((form, formIndex) => (
                  <div key={formIndex} className="border rounded-lg overflow-hidden">
                    <div className="bg-muted px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">Quote No: {form.quoteNo}</p>
                          <p className="text-xs text-muted-foreground">
                            Submitted: {new Date(form.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                          {form.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Client:</span>
                          <span className="ml-2 font-medium">{form.client}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Requested By:</span>
                          <span className="ml-2 font-medium">{form.requestedBy}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Department:</span>
                          <span className="ml-2 font-medium">{form.department}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Date Required:</span>
                          <span className="ml-2 font-medium">
                            {form.dateRequired ? new Date(form.dateRequired).toLocaleDateString() : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium">Item Code</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Item Name</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Quantity</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">UOM</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Unit Price</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Brand</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {form.items.map((item, itemIndex) => {
                            const itemCode = item.description.match(/SKU: ([A-Z0-9-]+)/)?.[1] || "N/A"
                            const brand = item.description.match(/Brand: ([^|]+)/)?.[1]?.trim() || "N/A"
                            const total = item.price * item.quantity
                            return (
                              <tr key={itemIndex} className="border-t">
                                <td className="px-4 py-3 text-sm">{itemCode}</td>
                                <td className="px-4 py-3 text-sm">{item.name}</td>
                                <td className="px-4 py-3 text-sm">{item.quantity}</td>
                                <td className="px-4 py-3 text-sm">PC</td>
                                <td className="px-4 py-3 text-sm">₱{item.price.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm">{brand}</td>
                                <td className="px-4 py-3 text-sm font-medium">₱{total.toFixed(2)}</td>
                              </tr>
                            )
                          })}
                          <tr className="border-t bg-muted/30">
                            <td colSpan={6} className="px-4 py-3 text-sm font-semibold text-right">
                              Grand Total:
                            </td>
                            <td className="px-4 py-3 text-sm font-bold">
                              ₱{form.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quotations List */}
      {activeTab === "list" && (
        <div className="p-6">
          

          {savedQuotations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-500 text-lg">No saved quotations yet</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setActiveTab("products")}
              >
                Create New Quotation
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Quote No.</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Client</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Department</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Date Required</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Total Amount</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">Items</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedQuotations
                      .sort((a, b) => {
                        // Sort by parent_id first, then by version
                        const aParent = a.parent_id || a.id
                        const bParent = b.parent_id || b.id
                        if (aParent !== bParent) return aParent.localeCompare(bParent)
                        return (a.version || 1) - (b.version || 1)
                      })
                      .map((quotation) => {
                      const total = quotation.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                      const isVersion = quotation.parent_id !== null && quotation.parent_id !== undefined
                      const getStatusColor = (status: string) => {
                        switch (status) {
                          case "Saved":
                            return "bg-gray-100 text-gray-800 hover:bg-gray-100"
                          case "Submitted":
                            return "bg-blue-100 text-blue-800 hover:bg-blue-100"
                          case "Under Negotiation":
                            return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                          case "Approved":
                            return "bg-green-100 text-green-800 hover:bg-green-100"
                          case "Rejected":
                            return "bg-red-100 text-red-800 hover:bg-red-100"
                          default:
                            return "bg-gray-100 text-gray-800 hover:bg-gray-100"
                        }
                      }

                      return (
                        <tr key={quotation.id} className={`border-t hover:bg-muted/50 ${isVersion ? 'bg-muted/20' : ''}`}>
                          <td className="px-4 py-3 text-sm font-medium">
                            {isVersion && (
                              <span className="inline-block mr-2 text-muted-foreground">└─</span>
                            )}
                            {quotation.quoteNo}
                          </td>
                          <td className="px-4 py-3 text-sm">{quotation.client}</td>
                          <td className="px-4 py-3 text-sm">{quotation.department}</td>
                          <td className="px-4 py-3 text-sm">
                            {quotation.dateRequired ? new Date(quotation.dateRequired).toLocaleDateString() : "N/A"}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <Badge className={getStatusColor(quotation.status)}>
                              {quotation.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-right">
                            ₱{total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-sm text-center">{quotation.items.length}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              {/* Primary: Export dropdown */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem onClick={() => toast.success("Exporting as PDF...")}>
                                    Export as PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => toast.success("Exporting as Excel...")}>
                                    Export as Excel
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>

                              {/* Secondary: More actions */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setSelectedQuotation(quotation)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>

                                  {(quotation.status === "Saved" || quotation.status === "Under Negotiation") && (
                                    <DropdownMenuItem onClick={() => handleEditQuotation(quotation)}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                  )}

                                  {quotation.status === "Under Negotiation" && (
                                    <DropdownMenuItem onClick={() => toast.success("Creating new version...")}>
                                      <Copy className="mr-2 h-4 w-4" />
                                      Create New Version
                                    </DropdownMenuItem>
                                  )}

                                  {quotation.status === "Approved" && (
                                    <DropdownMenuItem onClick={() => toast.success("Creating PR...")}>
                                      <FileText className="mr-2 h-4 w-4" />
                                      Create PR
                                    </DropdownMenuItem>
                                  )}

                                  {quotation.status === "Saved" && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => {
                                          if (confirm("Are you sure you want to delete this quotation?")) {
                                            toast.success("Quotation deleted")
                                          }
                                        }}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cart Sidebar */}
      <CartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onSubmit={handleSubmit}
      />

      {/* Quotation Details Sheet */}
      <Sheet open={selectedQuotation !== null} onOpenChange={(open) => !open && setSelectedQuotation(null)}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col">
          {selectedQuotation && (
            <>
              <SheetHeader>
                <SheetTitle className="flex flex-col items-start justify-start">
                  <span>Quotation Details</span>
                  <Badge variant="outline" className="">
                    {selectedQuotation.quoteNo}
                  </Badge>
                </SheetTitle>
              </SheetHeader>

              {/* Quotation Info */}
              <div className="grid grid-cols-2 gap-4 p-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Client</span>
                  <p className="font-medium">{selectedQuotation.client}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Requested By</span>
                  <p className="font-medium">{selectedQuotation.requestedBy}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Department</span>
                  <p className="font-medium">{selectedQuotation.department}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date Required</span>
                  <p className="font-medium">
                    {selectedQuotation.dateRequired ? new Date(selectedQuotation.dateRequired).toLocaleDateString() : "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Created</span>
                  <p className="font-medium">{new Date(selectedQuotation.timestamp).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <p>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                      {selectedQuotation.status}
                    </Badge>
                  </p>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Items List */}
              <div className="flex-1 overflow-y-auto">
                <div className="space-y-4 px-4">
                  {selectedQuotation.items.map((item, index) => {
                    const itemCode = item.description.match(/SKU: ([A-Z0-9-]+)/)?.[1] || "N/A"
                    const brand = item.description.match(/Brand: ([^|]+)/)?.[1]?.trim() || "N/A"
                    const total = item.price * item.quantity

                    return (
                      <div key={index} className="flex gap-4">
                        {/* Product Image Placeholder */}
                        <div className="w-20 h-20 bg-blue-500 rounded shrink-0" />

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-medium text-sm line-clamp-2">{item.name}</h4>
                          </div>

                          <Badge variant="outline" className="text-xs mb-2">
                            {item.category}
                          </Badge>

                          <div className="space-y-1 text-xs text-muted-foreground">
                            <p>SKU: {itemCode}</p>
                            <p>Brand: {brand}</p>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm font-medium">
                              Qty: {item.quantity}
                            </span>
                            <p className="text-sm font-semibold">
                              ₱{total.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <Separator className="my-4" />

              <SheetFooter className="flex-col gap-4">
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span>
                    ₱{selectedQuotation.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedQuotation(null)}
                  >
                    Close
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      // TODO: Implement Create PR functionality
                      toast.info("Create PR functionality to be implemented")
                    }}
                  >
                    Create PR
                  </Button>
                </div>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

    </div>
  )
}