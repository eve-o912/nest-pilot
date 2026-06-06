import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { Plus, AlertTriangle, X, Package, TrendingDown, DollarSign, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ReceiptModal } from "@/components/ReceiptModal";

interface Product {
  id: string;
  user_id: string;
  name: string;
  unit: string;
  buying_price: number;
  selling_price: number;
  current_stock: number;
  low_stock_alert: number;
  created_at: string;
}

const UNIT_OPTIONS = ["piece", "bag", "bottle", "kg", "litre", "other"];

export const Route = createFileRoute("/stock")({
  component: Stock,
  head: () => ({
    meta: [
      { title: "Stock — Nest Pilot" },
      { name: "description", content: "Manage your inventory and stock levels." },
    ],
  }),
});

function Stock() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  
  // Add Product form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newUnit, setNewUnit] = useState("piece");
  const [newBuyingPrice, setNewBuyingPrice] = useState("");
  const [newSellingPrice, setNewSellingPrice] = useState("");
  const [newOpeningStock, setNewOpeningStock] = useState("");
  const [newLowStockAlert, setNewLowStockAlert] = useState("5");
  
  // Restock modal state
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [restockQuantity, setRestockQuantity] = useState("");
  const [restockCost, setRestockCost] = useState("");
  
  // Sell modal state
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellQuantity, setSellQuantity] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [sellError, setSellError] = useState("");
  
  // Receipt modal state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<{
    customerName?: string;
    customerPhone?: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    totalAmount: number;
    paymentMethod: "Cash" | "M-Pesa" | "Card" | "Bank";
    mpesaReference?: string;
    timestamp: Date;
    businessName?: string;
  } | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    const totalProducts = products.length;
    const lowStock = products.filter(p => p.current_stock <= p.low_stock_alert).length;
    const stockValue = products.reduce((sum, p) => 
      sum + (p.current_stock * Number(p.buying_price)), 0
    );

    return { totalProducts, lowStock, stockValue };
  }, [products]);

  const lowStockProducts = useMemo(() => 
    products.filter(p => p.current_stock <= p.low_stock_alert && !dismissedAlerts.has(p.id)),
    [products, dismissedAlerts]
  );

  const formatKES = (amount: number) => {
    return `KES ${amount.toLocaleString("en-KE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const getStockLevelColor = (product: Product) => {
    if (product.current_stock <= product.low_stock_alert) return "bg-destructive";
    if (product.current_stock <= product.low_stock_alert * 2) return "bg-warning";
    return "bg-success";
  };

  const handleAddProduct = async () => {
    if (!newProductName.trim() || !newBuyingPrice || !newSellingPrice || !newOpeningStock) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("products")
        .insert({
          user_id: user.id,
          name: newProductName,
          unit: newUnit,
          buying_price: parseFloat(newBuyingPrice),
          selling_price: parseFloat(newSellingPrice),
          current_stock: parseInt(newOpeningStock),
          low_stock_alert: parseInt(newLowStockAlert),
        });

      if (error) throw error;

      setNewProductName("");
      setNewUnit("piece");
      setNewBuyingPrice("");
      setNewSellingPrice("");
      setNewOpeningStock("");
      setNewLowStockAlert("5");
      setShowAddModal(false);
      fetchProducts();
    } catch (error) {
      console.error("Error adding product:", error);
    }
  };

  const handleRestock = async () => {
    if (!selectedProduct || !restockQuantity || !restockCost) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const qty = parseInt(restockQuantity);
      const cost = parseFloat(restockCost);

      // Update product stock
      const { error: updateError } = await supabase
        .from("products")
        .update({ current_stock: selectedProduct.current_stock + qty })
        .eq("id", selectedProduct.id);

      if (updateError) throw updateError;

      // Insert restock transaction
      const { error: insertError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          type: "expense",
          amount: qty * cost,
          tag: "#restock",
          product_id: selectedProduct.id,
          quantity: qty,
          created_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      setRestockQuantity("");
      setRestockCost("");
      setShowRestockModal(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch (error) {
      console.error("Error restocking:", error);
    }
  };

  const handleSell = async () => {
    if (!selectedProduct || !sellQuantity || !sellPrice) return;

    const qty = parseInt(sellQuantity);
    
    // Validate stock
    if (qty > selectedProduct.current_stock) {
      setSellError("Huna stock ya kutosha (Not enough stock)");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const price = parseFloat(sellPrice);

      // Update product stock
      const { error: updateError } = await supabase
        .from("products")
        .update({ current_stock: selectedProduct.current_stock - qty })
        .eq("id", selectedProduct.id);

      if (updateError) throw updateError;

      // Insert sale transaction
      const { error: insertError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          type: "income",
          amount: qty * price,
          tag: "#sale",
          product_id: selectedProduct.id,
          quantity: qty,
          created_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      // Prepare receipt data
      const receiptData = {
        items: [{ name: selectedProduct.name, quantity: qty, price: price }],
        totalAmount: qty * price,
        paymentMethod: "Cash" as "Cash" | "M-Pesa" | "Card" | "Bank",
        timestamp: new Date(),
        businessName: "Business", // Will be fetched from settings in production
      };

      setLastSaleData(receiptData);
      setShowReceiptModal(true);

      setSellQuantity("");
      setSellPrice("");
      setSellError("");
      setShowSellModal(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch (error) {
      console.error("Error selling:", error);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-[1600px] px-6 pb-16">
        <div className="flex items-center justify-center py-20">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1600px] px-6 pb-16">
      {/* Header */}
      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Stock</h1>
          <p className="text-sm text-muted-foreground">
            Manage your inventory and stock levels
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </section>

      {/* Low Stock Alert Banner */}
      {lowStockProducts.length > 0 && (
        <section className="mb-6 space-y-2">
          {lowStockProducts.map((product) => (
            <div key={product.id} className="flex items-center justify-between rounded-sm bg-destructive/10 border border-destructive/20 p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <span className="font-medium text-destructive">
                  {product.name} inakwisha — restock haraka!
                </span>
              </div>
              <button
                onClick={() => {
                  setDismissedAlerts(new Set([...dismissedAlerts, product.id]));
                }}
                className="text-destructive hover:text-destructive/80"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ))}
        </section>
      )}

      {/* Summary Stats */}
      <section className="mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{summary.totalProducts}</span> Products
          </span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingDown className={`h-4 w-4 ${summary.lowStock > 0 ? "text-warning" : "text-muted-foreground"}`} />
          <span className={`text-sm ${summary.lowStock > 0 ? "text-warning font-semibold" : "text-muted-foreground"}`}>
            <span className="text-foreground">{summary.lowStock}</span> Low Stock
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Stock Value: <span className="font-semibold text-foreground">{formatKES(summary.stockValue)}</span>
          </span>
        </div>
      </section>

      {/* Product Grid */}
      {products.length === 0 ? (
        <section className="flex flex-col items-center justify-center py-20">
          <div className="text-center">
            <p className="text-lg font-medium text-muted-foreground mb-4">
              You haven't added products yet. Start here.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Add Product
            </button>
          </div>
        </section>
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => {
            const margin = ((Number(product.selling_price) - Number(product.buying_price)) / Number(product.buying_price) * 100).toFixed(1);
            const stockColor = getStockLevelColor(product);

            return (
              <div key={product.id} className="rounded-sm border border-border bg-card p-5">
                <div className="mb-4">
                  <h3 className="font-semibold text-lg">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">{product.unit}</p>
                </div>

                {/* Stock Level Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">
                      {product.current_stock} {product.unit}s remaining
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${stockColor}`}
                      style={{ width: `${Math.min((product.current_stock / (product.low_stock_alert * 3)) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Pricing */}
                <div className="mb-4 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Buying:</span>
                    <span className="font-mono">{formatKES(Number(product.buying_price))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Selling:</span>
                    <span className="font-mono">{formatKES(Number(product.selling_price))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Margin:</span>
                    <span className="font-mono font-semibold text-success">{margin}%</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedProduct(product);
                      setRestockQuantity("");
                      setRestockCost(product.buying_price.toString());
                      setShowRestockModal(true);
                    }}
                    className="flex-1 rounded-sm bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                  >
                    + Restock
                  </button>
                  <button
                    onClick={() => {
                      setSelectedProduct(product);
                      setSellQuantity("");
                      setSellPrice(product.selling_price.toString());
                      setSellError("");
                      setShowSellModal(true);
                    }}
                    className="flex-1 rounded-sm border border-border bg-background px-3 py-2 text-sm font-semibold hover:bg-secondary"
                  >
                    - Sell
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30">
          <div className="w-full max-w-md rounded-sm border border-border bg-card p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Product</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewProductName("");
                  setNewUnit("piece");
                  setNewBuyingPrice("");
                  setNewSellingPrice("");
                  setNewOpeningStock("");
                  setNewLowStockAlert("5");
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="h-10 w-full rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                  placeholder="e.g., Unga 2kg"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Unit *
                </label>
                <select
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="h-10 w-full rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                >
                  {UNIT_OPTIONS.map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Buying Price *
                </label>
                <input
                  type="number"
                  value={newBuyingPrice}
                  onChange={(e) => setNewBuyingPrice(e.target.value)}
                  className="h-10 w-full rounded-sm border border-input bg-background px-3 font-mono text-sm outline-none focus:border-ring"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Selling Price *
                </label>
                <input
                  type="number"
                  value={newSellingPrice}
                  onChange={(e) => setNewSellingPrice(e.target.value)}
                  className="h-10 w-full rounded-sm border border-input bg-background px-3 font-mono text-sm outline-none focus:border-ring"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Opening Stock *
                </label>
                <input
                  type="number"
                  value={newOpeningStock}
                  onChange={(e) => setNewOpeningStock(e.target.value)}
                  className="h-10 w-full rounded-sm border border-input bg-background px-3 font-mono text-sm outline-none focus:border-ring"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Low Stock Alert
                </label>
                <input
                  type="number"
                  value={newLowStockAlert}
                  onChange={(e) => setNewLowStockAlert(e.target.value)}
                  className="h-10 w-full rounded-sm border border-input bg-background px-3 font-mono text-sm outline-none focus:border-ring"
                  placeholder="5"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewProductName("");
                  setNewUnit("piece");
                  setNewBuyingPrice("");
                  setNewSellingPrice("");
                  setNewOpeningStock("");
                  setNewLowStockAlert("5");
                }}
                className="flex-1 rounded-sm border border-border bg-background py-2.5 text-sm font-medium hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProduct}
                className="flex-1 rounded-sm bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {showRestockModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30">
          <div className="w-full max-w-md rounded-sm border border-border bg-card p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Restock</h3>
              <button
                onClick={() => {
                  setShowRestockModal(false);
                  setSelectedProduct(null);
                  setRestockQuantity("");
                  setRestockCost("");
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">{selectedProduct.name}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Quantity Added
                </label>
                <input
                  type="number"
                  min="1"
                  value={restockQuantity}
                  onChange={(e) => setRestockQuantity(e.target.value)}
                  className="h-10 w-full rounded-sm border border-input bg-background px-3 font-mono text-sm outline-none focus:border-ring"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Cost Per Unit
                </label>
                <input
                  type="number"
                  value={restockCost}
                  onChange={(e) => setRestockCost(e.target.value)}
                  className="h-10 w-full rounded-sm border border-input bg-background px-3 font-mono text-sm outline-none focus:border-ring"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  setShowRestockModal(false);
                  setSelectedProduct(null);
                  setRestockQuantity("");
                  setRestockCost("");
                }}
                className="flex-1 rounded-sm border border-border bg-background py-2.5 text-sm font-medium hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleRestock}
                className="flex-1 rounded-sm bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sell Modal */}
      {showSellModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30">
          <div className="w-full max-w-md rounded-sm border border-border bg-card p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Sell</h3>
              <button
                onClick={() => {
                  setShowSellModal(false);
                  setSelectedProduct(null);
                  setSellQuantity("");
                  setSellPrice("");
                  setSellError("");
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">{selectedProduct.name}</p>
              <p className="text-xs text-muted-foreground">
                Available stock: {selectedProduct.current_stock} {selectedProduct.unit}s
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Quantity Sold
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedProduct.current_stock}
                  value={sellQuantity}
                  onChange={(e) => {
                    setSellQuantity(e.target.value);
                    setSellError("");
                  }}
                  className="h-10 w-full rounded-sm border border-input bg-background px-3 font-mono text-sm outline-none focus:border-ring"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Selling Price
                </label>
                <input
                  type="number"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  className="h-10 w-full rounded-sm border border-input bg-background px-3 font-mono text-sm outline-none focus:border-ring"
                  placeholder="0"
                />
              </div>

              {sellError && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {sellError}
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  setShowSellModal(false);
                  setSelectedProduct(null);
                  setSellQuantity("");
                  setSellPrice("");
                  setSellError("");
                }}
                className="flex-1 rounded-sm border border-border bg-background py-2.5 text-sm font-medium hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSell}
                className="flex-1 rounded-sm bg-success py-2.5 text-sm font-semibold text-success-foreground hover:opacity-90"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {lastSaleData && (
        <ReceiptModal
          isOpen={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false);
            setLastSaleData(null);
          }}
          saleData={lastSaleData}
        />
      )}
    </main>
  );
}
