import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Plus, Trash2, Download, X as XIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatKES } from "@/lib/store";
import { format } from "date-fns";

export const Route = createFileRoute("/payroll")({
  component: Payroll,
  head: () => ({
    meta: [
      { title: "Payroll — Nest Pilot" },
      { name: "description", content: "Process payroll and manage employees." },
    ],
  }),
});

// KRA Tax Bands 2024
const KRA_TAX_BANDS = [
  { min: 0, max: 24000, rate: 0.1 },
  { min: 24001, max: 32333, rate: 0.25 },
  { min: 32334, max: 40416, rate: 0.3 },
  { min: 40417, max: 50000, rate: 0.325 },
  { min: 50001, max: Infinity, rate: 0.35 },
];

function calculatePAYE(grossSalary: number): number {
  let paye = 0;
  for (const band of KRA_TAX_BANDS) {
    if (grossSalary > band.min) {
      const taxableInBand = Math.min(grossSalary, band.max) - band.min;
      paye += taxableInBand * band.rate;
    }
  }
  return Math.round(paye * 100) / 100;
}

function calculateNSSF(grossSalary: number): { employee: number; employer: number } {
  const nssfRate = 0.06;
  const nssfCap = 2160; // Monthly cap
  const employee = Math.min(grossSalary * nssfRate, nssfCap);
  const employer = Math.min(grossSalary * nssfRate, nssfCap);
  return { employee: Math.round(employee * 100) / 100, employer: Math.round(employer * 100) / 100 };
}

function calculateNHIF(grossSalary: number): number {
  // NHIF tiers (monthly)
  if (grossSalary <= 5999) return 150;
  if (grossSalary <= 7999) return 300;
  if (grossSalary <= 11999) return 400;
  if (grossSalary <= 14999) return 500;
  if (grossSalary <= 19999) return 600;
  if (grossSalary <= 24999) return 750;
  if (grossSalary <= 29999) return 850;
  if (grossSalary <= 34999) return 900;
  if (grossSalary <= 39999) return 950;
  if (grossSalary <= 44999) return 1000;
  if (grossSalary <= 49999) return 1100;
  if (grossSalary <= 59999) return 1200;
  if (grossSalary <= 69999) return 1300;
  if (grossSalary <= 79999) return 1400;
  if (grossSalary <= 89999) return 1500;
  return 1600;
}

function calculateHousingLevy(grossSalary: number): { employee: number; employer: number } {
  const levyRate = 0.015;
  const employee = grossSalary * levyRate;
  const employer = grossSalary * levyRate;
  return { employee: Math.round(employee * 100) / 100, employer: Math.round(employer * 100) / 100 };
}

function Payroll() {
  const [tab, setTab] = useState<"employees" | "runs">("employees");
  const [employees, setEmployees] = useState<any[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ name: "", id_number: "", job_title: "", gross_salary: 0 });

  useEffect(() => {
    fetchData();
  }, [tab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (tab === "employees") {
        const { data } = await supabase
          .from("employees")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("name");
        setEmployees(data || []);
      } else {
        const { data } = await supabase
          .from("payroll_runs")
          .select("*,payslips(*)")
          .eq("user_id", user.id)
          .order("period_year", { ascending: false })
          .order("period_month", { ascending: false });
        setPayrollRuns(data || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async () => {
    if (!newEmployee.name || !newEmployee.id_number || newEmployee.gross_salary <= 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("employees").insert({
        user_id: user.id,
        name: newEmployee.name,
        id_number: newEmployee.id_number,
        job_title: newEmployee.job_title,
        gross_salary: newEmployee.gross_salary,
        status: "active",
      });

      setNewEmployee({ name: "", id_number: "", job_title: "", gross_salary: 0 });
      setShowEmployeeModal(false);
      fetchData();
    } catch (error) {
      console.error("Error adding employee:", error);
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (confirm("Delete this employee?")) {
      try {
        await supabase
          .from("employees")
          .update({ status: "terminated" })
          .eq("id", employeeId);
        fetchData();
      } catch (error) {
        console.error("Error deleting employee:", error);
      }
    }
  };

  const handleRunPayroll = async () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create payroll run
      const { data: run } = await supabase
        .from("payroll_runs")
        .insert({
          user_id: user.id,
          period_month: month,
          period_year: year,
          status: "draft",
        })
        .select()
        .single();

      if (!run) return;

      // Generate payslips
      const payslips = employees.map((emp) => {
        const gross = emp.gross_salary;
        const paye = calculatePAYE(gross);
        const nssf = calculateNSSF(gross);
        const nhif = calculateNHIF(gross);
        const housing = calculateHousingLevy(gross);

        const totalDeductions = paye + nssf.employee + nhif + housing.employee;
        const netPay = gross - totalDeductions;

        return {
          payroll_run_id: run.id,
          employee_id: emp.id,
          gross_salary: gross,
          paye,
          nssf_employee: nssf.employee,
          nhif,
          housing_levy_employee: housing.employee,
          total_deductions: totalDeductions,
          net_pay: netPay,
        };
      });

      await supabase.from("payslips").insert(payslips);

      // Post to journal (Debit Salary Expense, Credit Payables)
      const totalPayroll = payslips.reduce((sum, ps) => sum + ps.gross_salary, 0);

      // This would call a function to post journal entries
      // For now, we're just creating the payslips

      alert(`Payroll run created for ${format(new Date(year, month - 1), "MMMM yyyy")}`);
      fetchData();
    } catch (error) {
      console.error("Error running payroll:", error);
    }
  };

  return (
    <main className="mx-auto max-w-[1600px] px-6 pb-16">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Payroll</h1>
        <p className="text-sm text-muted-foreground">Manage employees and process monthly payroll</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-border">
        <button
          onClick={() => setTab("employees")}
          className={`px-4 py-3 font-medium text-sm ${tab === "employees" ? "border-b-2 border-[#00AEEF] text-[#00AEEF]" : "text-muted-foreground"}`}
        >
          Employees
        </button>
        <button
          onClick={() => setTab("runs")}
          className={`px-4 py-3 font-medium text-sm ${tab === "runs" ? "border-b-2 border-[#00AEEF] text-[#00AEEF]" : "text-muted-foreground"}`}
        >
          Payroll Runs
        </button>
      </div>

      {/* Employees Tab */}
      {tab === "employees" && (
        <div>
          <div className="mb-4 flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{employees.length} active employees</p>
            <button
              onClick={() => setShowEmployeeModal(true)}
              className="inline-flex items-center gap-2 rounded-sm bg-[#00AEEF] px-4 py-2 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Add Employee
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="rounded-sm border border-border bg-card p-12 text-center">
              <p className="text-muted-foreground mb-4">No employees yet</p>
              <button
                onClick={() => setShowEmployeeModal(true)}
                className="inline-flex items-center gap-2 rounded-sm bg-[#00AEEF] px-4 py-2 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                Add your first employee
              </button>
            </div>
          ) : (
            <div className="rounded-sm border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-6 py-3 font-medium">ID Number</th>
                    <th className="px-6 py-3 font-medium">Job Title</th>
                    <th className="px-6 py-3 font-medium text-right">Gross Salary</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id} className="border-b border-border hover:bg-secondary/30">
                      <td className="px-6 py-4">{emp.name}</td>
                      <td className="px-6 py-4 font-mono text-muted-foreground">{emp.id_number}</td>
                      <td className="px-6 py-4 text-muted-foreground">{emp.job_title || "—"}</td>
                      <td className="px-6 py-4 text-right font-mono">{formatKES(emp.gross_salary)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteEmployee(emp.id)}
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
        </div>
      )}

      {/* Payroll Runs Tab */}
      {tab === "runs" && (
        <div>
          <div className="mb-4 flex justify-end">
            <button
              onClick={handleRunPayroll}
              className="inline-flex items-center gap-2 rounded-sm bg-[#00AEEF] px-4 py-2 text-sm font-semibold text-white"
            >
              Run Payroll for This Month
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : payrollRuns.length === 0 ? (
            <div className="rounded-sm border border-border bg-card p-12 text-center">
              <p className="text-muted-foreground">No payroll runs yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {payrollRuns.map((run) => {
                const totalGross = run.payslips?.reduce((sum: number, ps: any) => sum + ps.gross_salary, 0) || 0;
                const totalNet = run.payslips?.reduce((sum: number, ps: any) => sum + ps.net_pay, 0) || 0;

                return (
                  <div key={run.id} className="rounded-sm border border-border bg-card p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold">{format(new Date(run.period_year, run.period_month - 1), "MMMM yyyy")}</h3>
                        <p className="text-sm text-muted-foreground">{run.payslips?.length || 0} employees</p>
                      </div>
                      <span className="px-2 py-1 rounded-sm bg-secondary text-xs font-semibold">{run.status}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Total Gross</p>
                        <p className="font-mono font-bold">{formatKES(totalGross)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Total Deductions</p>
                        <p className="font-mono font-bold">{formatKES(totalGross - totalNet)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Total Net</p>
                        <p className="font-mono font-bold">{formatKES(totalNet)}</p>
                      </div>
                    </div>

                    <button className="text-sm text-[#00AEEF] hover:underline">View Payslips</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Employee Modal */}
      {showEmployeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30">
          <div className="w-full max-w-md rounded-sm border border-border bg-card p-6 m-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Add Employee</h2>
              <button onClick={() => setShowEmployeeModal(false)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Name</label>
                <input
                  type="text"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  className="w-full h-10 rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                  placeholder="Employee name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">ID Number</label>
                <input
                  type="text"
                  value={newEmployee.id_number}
                  onChange={(e) => setNewEmployee({ ...newEmployee, id_number: e.target.value })}
                  className="w-full h-10 rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                  placeholder="National ID"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Job Title</label>
                <input
                  type="text"
                  value={newEmployee.job_title}
                  onChange={(e) => setNewEmployee({ ...newEmployee, job_title: e.target.value })}
                  className="w-full h-10 rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                  placeholder="Job title"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Gross Salary (KES)</label>
                <input
                  type="number"
                  value={newEmployee.gross_salary}
                  onChange={(e) => setNewEmployee({ ...newEmployee, gross_salary: parseFloat(e.target.value) })}
                  className="w-full h-10 rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setShowEmployeeModal(false)}
                className="flex-1 h-10 rounded-sm border border-border bg-background hover:bg-secondary text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEmployee}
                className="flex-1 h-10 rounded-sm bg-[#00AEEF] text-white text-sm font-semibold hover:opacity-90"
              >
                Add Employee
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
