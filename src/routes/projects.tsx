import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Plus, Clock, DollarSign, Trash2, Link as LinkIcon, X as XIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatKES } from "@/lib/store";
import { format } from "date-fns";

export const Route = createFileRoute("/projects")({
  component: Projects,
  head: () => ({
    meta: [
      { title: "Projects — Nest Pilot" },
      { name: "description", content: "Manage projects and track time billing." },
    ],
  }),
});

function Projects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [showModal, setShowModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    customer_id: "",
    description: "",
    billing_type: "hourly" as "hourly" | "fixed",
    budget_amount: 0,
    hourly_rate: 0,
    start_date: "",
    end_date: "",
  });

  const [timeEntry, setTimeEntry] = useState({
    entry_date: format(new Date(), "yyyy-MM-dd"),
    hours: 0,
    description: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [projectsData, customersData] = await Promise.all([
        supabase
          .from("projects")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("customers")
          .select("id,business_name")
          .eq("user_id", user.id),
      ]);

      setProjects(projectsData.data || []);
      setCustomers(customersData.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!formData.name) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("projects").insert({
        user_id: user.id,
        name: formData.name,
        customer_id: formData.customer_id || null,
        description: formData.description,
        billing_type: formData.billing_type,
        budget_amount: formData.billing_type === "fixed" ? formData.budget_amount : null,
        hourly_rate: formData.billing_type === "hourly" ? formData.hourly_rate : null,
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: "active",
      });

      setFormData({
        name: "",
        customer_id: "",
        description: "",
        billing_type: "hourly",
        budget_amount: 0,
        hourly_rate: 0,
        start_date: "",
        end_date: "",
      });
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  const handleAddTimeEntry = async () => {
    if (!selectedProject || !timeEntry.hours || timeEntry.hours <= 0) return;

    try {
      const rate = selectedProject.hourly_rate || 0;
      await supabase.from("time_entries").insert({
        project_id: selectedProject.id,
        entry_date: timeEntry.entry_date,
        hours: timeEntry.hours,
        description: timeEntry.description,
        hourly_rate: rate,
      });

      setTimeEntry({
        entry_date: format(new Date(), "yyyy-MM-dd"),
        hours: 0,
        description: "",
      });
      setShowTimeModal(false);
      fetchData();
    } catch (error) {
      console.error("Error adding time entry:", error);
    }
  };

  const handleChangeStatus = async (projectId: string, newStatus: string) => {
    try {
      await supabase
        .from("projects")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", projectId);

      fetchData();
    } catch (error) {
      console.error("Error updating project:", error);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (confirm("Delete this project?")) {
      try {
        await supabase.from("projects").delete().eq("id", projectId);
        fetchData();
      } catch (error) {
        console.error("Error deleting project:", error);
      }
    }
  };

  const getProjectProfitability = (project: any) => {
    // This would fetch time entries and calculate billed vs cost
    return { billed: 0, cost: 0, profit: 0 };
  };

  const filteredProjects = projects.filter((p) => activeTab === "all" || p.status === activeTab);

  return (
    <main className="mx-auto max-w-[1600px] px-6 pb-16">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="text-sm text-muted-foreground">Manage projects and track time billing</p>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        {["active", "completed", "on_hold", "cancelled", "all"].map((status) => (
          <button
            key={status}
            onClick={() => setActiveTab(status)}
            className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${
              activeTab === status
                ? "bg-[#00AEEF] text-white"
                : "bg-card text-muted-foreground hover:bg-secondary"
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-sm bg-[#00AEEF] px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-sm border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground mb-4">No projects yet</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-sm bg-[#00AEEF] px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Create your first project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((project) => {
            const profit = getProjectProfitability(project);
            const customerName = customers.find((c) => c.id === project.customer_id)?.business_name;

            return (
              <div key={project.id} className="rounded-sm border border-border bg-card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{project.name}</h3>
                    {customerName && <p className="text-xs text-muted-foreground">{customerName}</p>}
                  </div>
                  <select
                    value={project.status}
                    onChange={(e) => handleChangeStatus(project.id, e.target.value)}
                    className="px-2 py-1 rounded-sm border border-input bg-background text-xs"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {project.description && (
                  <p className="text-sm text-muted-foreground mb-3">{project.description}</p>
                )}

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-secondary/30 p-2 rounded-sm">
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="font-semibold text-sm">{project.billing_type === "hourly" ? "Time & Materials" : "Fixed Price"}</p>
                  </div>
                  <div className="bg-secondary/30 p-2 rounded-sm">
                    <p className="text-xs text-muted-foreground">{project.billing_type === "hourly" ? "Rate" : "Budget"}</p>
                    <p className="font-semibold text-sm">
                      {project.billing_type === "hourly"
                        ? formatKES(project.hourly_rate || 0) + " /hr"
                        : formatKES(project.budget_amount || 0)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedProject(project);
                      setShowTimeModal(true);
                    }}
                    className="flex-1 h-10 rounded-sm border border-border bg-background hover:bg-secondary text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Clock className="h-4 w-4" />
                    Log Time
                  </button>
                  <button
                    onClick={() => handleDeleteProject(project.id)}
                    className="h-10 w-10 rounded-sm border border-border bg-background hover:bg-secondary flex items-center justify-center"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30">
          <div className="w-full max-w-md rounded-sm border border-border bg-card p-6 m-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">New Project</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Project Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-10 rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Customer (Optional)</label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                  className="w-full h-10 rounded-sm border border-input bg-background px-3 text-sm"
                >
                  <option value="">No customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.business_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Billing Type</label>
                <select
                  value={formData.billing_type}
                  onChange={(e) => setFormData({ ...formData, billing_type: e.target.value as any })}
                  className="w-full h-10 rounded-sm border border-input bg-background px-3 text-sm"
                >
                  <option value="hourly">Hourly</option>
                  <option value="fixed">Fixed Price</option>
                </select>
              </div>

              {formData.billing_type === "hourly" ? (
                <div>
                  <label className="block text-xs font-semibold mb-1">Hourly Rate (KES)</label>
                  <input
                    type="number"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) })}
                    className="w-full h-10 rounded-sm border border-input bg-background px-3 text-sm"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold mb-1">Budget (KES)</label>
                  <input
                    type="number"
                    value={formData.budget_amount}
                    onChange={(e) => setFormData({ ...formData, budget_amount: parseFloat(e.target.value) })}
                    className="w-full h-10 rounded-sm border border-input bg-background px-3 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full h-20 rounded-sm border border-input bg-background px-3 py-2 text-sm resize-none"
                  placeholder="Project description..."
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 h-10 rounded-sm border border-border bg-background hover:bg-secondary text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                className="flex-1 h-10 rounded-sm bg-[#00AEEF] text-white text-sm font-semibold hover:opacity-90"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Entry Modal */}
      {showTimeModal && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30">
          <div className="w-full max-w-md rounded-sm border border-border bg-card p-6 m-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Log Time - {selectedProject.name}</h2>
              <button onClick={() => setShowTimeModal(false)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Date</label>
                <input
                  type="date"
                  value={timeEntry.entry_date}
                  onChange={(e) => setTimeEntry({ ...timeEntry, entry_date: e.target.value })}
                  className="w-full h-10 rounded-sm border border-input bg-background px-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={timeEntry.hours}
                  onChange={(e) => setTimeEntry({ ...timeEntry, hours: parseFloat(e.target.value) })}
                  className="w-full h-10 rounded-sm border border-input bg-background px-3 text-sm"
                  placeholder="0.0"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Description</label>
                <textarea
                  value={timeEntry.description}
                  onChange={(e) => setTimeEntry({ ...timeEntry, description: e.target.value })}
                  className="w-full h-20 rounded-sm border border-input bg-background px-3 py-2 text-sm resize-none"
                  placeholder="What did you work on?"
                />
              </div>

              {selectedProject.hourly_rate && (
                <div className="bg-secondary/30 p-3 rounded-sm">
                  <p className="text-xs text-muted-foreground mb-1">Billable Amount</p>
                  <p className="text-lg font-bold font-mono">{formatKES(timeEntry.hours * selectedProject.hourly_rate)}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setShowTimeModal(false)}
                className="flex-1 h-10 rounded-sm border border-border bg-background hover:bg-secondary text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTimeEntry}
                className="flex-1 h-10 rounded-sm bg-[#00AEEF] text-white text-sm font-semibold hover:opacity-90"
              >
                Log Time
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
