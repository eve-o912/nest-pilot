import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, Edit, Trash2, Send, CheckCircle, X as XIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatKES } from "@/lib/store";

export const Route = createFileRoute("/purchase-orders/$id")({
  component: PurchaseOrderDetail,
  head: () => ({
    meta: [
      { title: "Purchase Order Details — Nest Pilot" },
      { name: "description", content: "View purchase order details and items." },
    ],
  }),
});

function PurchaseOrderDetail() {
  const { id } = Route.useParams();
  const [po, setPo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPurchaseOrder();
  }, [id]);

  const fetchPurchaseOrder = async () => {
    try {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setPo(data);
    } catch (error) {
      console.error("Error fetching purchase order:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!po) {
    return <div className="p-6">Purchase order not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/purchase-orders"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Purchase Orders
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">{po.po_number}</h1>
            <p className="text-sm text-muted-foreground">{po.supplier_name}</p>
          </div>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-2 rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-secondary">
              <Edit className="h-4 w-4" />
              Edit
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-secondary">
              <Send className="h-4 w-4" />
              Send
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-medium capitalize">{po.status}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Order Date</p>
            <p className="font-medium">{new Date(po.order_date).toLocaleDateString("en-KE")}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Expected Delivery</p>
            <p className="font-medium">{po.expected_delivery ? new Date(po.expected_delivery).toLocaleDateString("en-KE") : "Not set"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="font-medium">{formatKES(po.total_amount || 0)}</p>
          </div>
        </div>

        {po.notes && (
          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-2">Notes</p>
            <p className="text-sm">{po.notes}</p>
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold mb-4">Items</h3>
          <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody>
                {po.items?.map((item: any, index: number) => (
                  <tr key={index} className="border-t border-[#E2E8F0]">
                    <td className="px-4 py-3 text-sm">{item.description}</td>
                    <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatKES(item.unit_price)}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatKES(item.quantity * item.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
