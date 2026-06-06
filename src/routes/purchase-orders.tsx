import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Plus, Filter, MoreHorizontal, Trash2, Edit, Send, CheckCircle, X as XIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatKES } from "@/lib/store";

export const Route = createFileRoute("/purchase-orders")({
  component: PurchaseOrders,
  head: () => ({
    meta: [
      { title: "Purchase Orders — Nest Pilot" },
      { name: "description", content: "Create and manage purchase orders for suppliers." },
    ],
  }),
});

function PurchaseOrders() {
  const [pos, setPos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingPo, setEditingPo] = useState<any>(null);
  const [formData, setFormData] = useState({
    supplier_name: "",
    delivery_date: "",
    notes: "",
  });
  const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({ description: "", quantity: 1, unit_price: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPos();
  }, [statusFilter]);

  const fetchPos = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("purchase_orders")
        .select("*")
        .eq("user_id", user.id);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data } = await query.order("created_at", { ascending: false });
      setPos(data || []);
    } catch (error) {
      console.error("Error fetching POs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingPo(null);
    setFormData({ supplier_name: "", delivery_date: "", notes: "" });
    setItems([]);
    setNewItem({ description: "", quantity: 1, unit_price: 0 });
    setShowModal(true);
  };

  const handleAddItem = () => {
    if (newItem.description && newItem.quantity > 0 && newItem.unit_price > 0) {
      setItems([...items, { ...newItem, id: Math.random() }]);
      setNewItem({ description: "", quantity: 1, unit_price: 0 });
    }
  };

  const handleRemoveItem = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleSubmit = async () => {
    if (!formData.supplier_name) {
      setError("Supplier name is required");
      return;
    }
    if (items.length === 0) {
      setError("Please add at least one item");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("User not authenticated");
        return;
      }

      if (editingPo) {
        // Update existing PO
        const { error: updateError } = await supabase
          .from("purchase_orders")
          .update({
            supplier_name: formData.supplier_name,
            delivery_date: formData.delivery_date,
            notes: formData.notes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingPo.id);

        if (updateError) throw updateError;

        // Delete old items and insert new ones
        const { error: deleteError } = await supabase.from("purchase_order_items").delete().eq("po_id", editingPo.id);
        if (deleteError) throw deleteError;

        const itemsToInsert = items.map((item) => ({
          po_id: editingPo.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }));

        const { error: itemsError } = await supabase.from("purchase_order_items").insert(itemsToInsert);
        if (itemsError) throw itemsError;
      } else {
        // Create new PO
        const { data: poNumber } = await supabase.rpc("generate_po_number", { user_uuid: user.id });

        const { data: newPo, error: insertError } = await supabase
          .from("purchase_orders")
          .insert({
            user_id: user.id,
            po_number: poNumber,
            supplier_name: formData.supplier_name,
            delivery_date: formData.delivery_date,
            notes: formData.notes,
            status: "draft",
          })
          .select()
          .single();

        if (insertError) throw insertError;

        if (newPo) {
          const itemsToInsert = items.map((item) => ({
            po_id: newPo.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
          }));

          const { error: itemsError } = await supabase.from("purchase_order_items").insert(itemsToInsert);
          if (itemsError) throw itemsError;
        }
      }

      setShowModal(false);
      fetchPos();
    } catch (error: any) {
      console.error("Error saving PO:", error);
      setError(error.message || "Failed to save purchase order");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatus = async (poId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("purchase_orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", poId);

      if (error) throw error;
      fetchPos();
    } catch (error: any) {
      console.error("Error updating PO status:", error);
      alert(error.message || "Failed to update status");
    }
  };

  const handleDelete = async (poId: string) => {
    if (confirm("Delete this PO?")) {
      try {
        const { error } = await supabase.from("purchase_orders").delete().eq("id", poId);
        if (error) throw error;
        fetchPos();
      } catch (error: any) {
        console.error("Error deleting PO:", error);
        alert(error.message || "Failed to delete purchase order");
      }
    }
  };

  const getTotalAmount = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  };

  return (
    <main className="mx-auto max-w-[1600px] px-6 pb-16">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Purchase Orders</h1>
        <p className="text-sm text-muted-foreground">Create and manage purchase orders for suppliers</p>
      </div>

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {["all", "draft", "sent", "received", "cancelled"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${
                statusFilter === status
                  ? "bg-[#00AEEF] text-white"
                  : "bg-card text-muted-foreground hover:bg-secondary"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={handleCreateNew}
          className="inline-flex items-center gap-2 rounded-sm bg-[#00AEEF] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New PO
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : pos.length === 0 ? (
        <div className="rounded-sm border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground mb-4">No purchase orders yet</p>
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center gap-2 rounded-sm bg-[#00AEEF] px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Create your first PO
          </button>
        </div>
      ) : (
        <div className="rounded-sm border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-3 font-medium">PO #</th>
                <th className="px-6 py-3 font-medium">Supplier</th>
                <th className="px-6 py-3 font-medium">Items</th>
                <th className="px-6 py-3 font-medium text-right">Amount</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pos.map((po) => (
                <tr key={po.id} className="border-b border-border hover:bg-secondary/30">
                  <td className="px-6 py-4 font-mono text-sm">{po.po_number}</td>
                  <td className="px-6 py-4">{po.supplier_name}</td>
                  <td className="px-6 py-4 text-muted-foreground">
                    <Link to={`/purchase-orders/${po.id}`} className="text-blue-500 hover:underline">
                      View items
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-right font-mono">
                    <Link to={`/purchase-orders/${po.id}`} className="text-blue-500 hover:underline">
                      {formatKES(po.total_amount || 0)}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={po.status}
                      onChange={(e) => handleChangeStatus(po.id, e.target.value)}
                      className="px-2 py-1 rounded-sm border border-input bg-background text-sm"
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="received">Received</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(po.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30">
          <div className="w-full max-w-2xl rounded-sm border border-border bg-card p-6 m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">{editingPo ? "Edit PO" : "New Purchase Order"}</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Supplier Name</label>
                <input
                  type="text"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  className="w-full h-10 rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                  placeholder="Supplier name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Delivery Date</label>
                <input
                  type="date"
                  value={formData.delivery_date}
                  onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                  className="w-full h-10 rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-3">Items</label>
                <div className="space-y-2 mb-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-secondary/30 p-3 rounded-sm">
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} × {formatKES(item.unit_price)} = {formatKES(item.quantity * item.unit_price)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Description"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    className="h-10 rounded-sm border border-input bg-background px-3 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) })}
                    className="h-10 rounded-sm border border-input bg-background px-3 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={newItem.unit_price}
                    onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) })}
                    className="h-10 rounded-sm border border-input bg-background px-3 text-sm"
                  />
                </div>
                <button
                  onClick={handleAddItem}
                  className="w-full h-10 rounded-sm border border-border bg-background text-sm font-medium hover:bg-secondary"
                >
                  Add Item
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full h-20 rounded-sm border border-input bg-background px-3 py-2 text-sm resize-none"
                  placeholder="Order notes..."
                />
              </div>

              {error && (
                <div className="p-3 rounded-sm bg-red-500/10 text-red-600 text-sm">
                  {error}
                </div>
              )}
              <div className="bg-secondary/30 p-3 rounded-sm">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">{formatKES(getTotalAmount())}</p>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  setShowModal(false);
                  setError("");
                }}
                className="flex-1 h-10 rounded-sm border border-border bg-background hover:bg-secondary text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 h-10 rounded-sm bg-[#00AEEF] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Saving..." : (editingPo ? "Update" : "Create") + " PO"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
