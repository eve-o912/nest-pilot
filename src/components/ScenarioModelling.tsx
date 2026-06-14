import { useState } from "react";
import { formatKES } from "@/lib/store";
import { TrendingUp, TrendingDown, Calculator, Play } from "lucide-react";

interface Scenario {
  name: string;
  mrrGrowth: number;
  burnChange: number;
  runwayMonths: number;
  finalMRR: number;
  finalCash: number;
}

export function ScenarioModelling() {
  const [cashBalance, setCashBalance] = useState(4200000);
  const [currentMRR, setCurrentMRR] = useState(180000);
  const [monthlyBurn, setMonthlyBurn] = useState(467000);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  const calculateScenarios = () => {
    const conservative = {
      name: "Conservative",
      mrrGrowth: 8,
      burnChange: 0,
    };

    const base = {
      name: "Base Case",
      mrrGrowth: 14,
      burnChange: 5,
    };

    const optimistic = {
      name: "Optimistic",
      mrrGrowth: 25,
      burnChange: 10,
    };

    const calculateScenario = (scenario: typeof conservative): Scenario => {
      let cash = cashBalance;
      let mrr = currentMRR;
      let burn = monthlyBurn;
      let months = 0;

      while (cash > 0 && months < 24) {
        months++;
        mrr = mrr * (1 + scenario.mrrGrowth / 100);
        burn = burn * (1 + scenario.burnChange / 100);
        cash = cash - (burn - mrr);
      }

      return {
        name: scenario.name,
        mrrGrowth: scenario.mrrGrowth,
        burnChange: scenario.burnChange,
        runwayMonths: months,
        finalMRR: mrr,
        finalCash: Math.max(0, cash),
      };
    };

    setScenarios([calculateScenario(conservative), calculateScenario(base), calculateScenario(optimistic)]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Scenario Modelling</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Model different growth and burn scenarios to understand your runway and MRR trajectory.
        </p>
      </div>

      {/* Input Parameters */}
      <div className="border border-border bg-card p-6">
        <h3 className="font-semibold mb-4">Current Parameters</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Cash Balance
            </label>
            <input
              type="number"
              value={cashBalance}
              onChange={(e) => setCashBalance(Number(e.target.value))}
              className="w-full h-10 rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Current MRR
            </label>
            <input
              type="number"
              value={currentMRR}
              onChange={(e) => setCurrentMRR(Number(e.target.value))}
              className="w-full h-10 rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Monthly Burn
            </label>
            <input
              type="number"
              value={monthlyBurn}
              onChange={(e) => setMonthlyBurn(Number(e.target.value))}
              className="w-full h-10 rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
            />
          </div>
        </div>
        <button
          onClick={calculateScenarios}
          className="mt-4 inline-flex items-center gap-2 rounded-sm bg-sky px-4 py-2 text-sm font-semibold text-sky-foreground hover:opacity-90"
        >
          <Calculator className="h-4 w-4" />
          Calculate Scenarios
        </button>
      </div>

      {/* Scenarios Table */}
      {scenarios.length > 0 && (
        <div className="border border-border bg-card p-6">
          <h3 className="font-semibold mb-4">Scenario Results</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 font-medium">Scenario</th>
                  <th className="pb-3 font-medium">MRR Growth</th>
                  <th className="pb-3 font-medium">Burn Change</th>
                  <th className="pb-3 font-medium">Runway</th>
                  <th className="pb-3 font-medium">Final MRR</th>
                  <th className="pb-3 font-medium">Final Cash</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((scenario, index) => (
                  <tr key={index} className="border-b border-border last:border-0">
                    <td className="py-3 font-medium text-foreground">{scenario.name}</td>
                    <td className="py-3 text-muted-foreground">{scenario.mrrGrowth}%</td>
                    <td className="py-3 text-muted-foreground">{scenario.burnChange}%</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1 ${
                        scenario.runwayMonths >= 12 ? "text-green-600" : scenario.runwayMonths >= 6 ? "text-yellow-600" : "text-red-600"
                      }`}>
                        {scenario.runwayMonths} months
                      </span>
                    </td>
                    <td className="py-3 text-foreground">{formatKES(scenario.finalMRR)}</td>
                    <td className="py-3 text-foreground">{formatKES(scenario.finalCash)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recommendation */}
      {scenarios.length > 0 && (
        <div className="border-l-4 border-sky-500 bg-sky-50 dark:bg-sky-950/20 p-4">
          <p className="text-sm font-medium text-sky-900 dark:text-sky-100">
            Based on your scenarios, the base case gives you {scenarios[1].runwayMonths} months of runway. 
            If growth slows to conservative levels, you'd have {scenarios[0].runwayMonths} months. 
            Plan to start fundraising 3-4 months before your conservative runway ends.
          </p>
        </div>
      )}
    </div>
  );
}
