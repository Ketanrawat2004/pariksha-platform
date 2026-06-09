import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function SubmitChart({
  answered,
  marked,
  unanswered,
  total,
}: {
  answered: number;
  marked: number;
  unanswered: number;
  total: number;
}) {
  return (
    <div className="h-[120px] w-[120px] relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={[
              { name: "Answered", value: answered, fill: "hsl(var(--success))" },
              { name: "Marked", value: marked, fill: "hsl(var(--warning))" },
              { name: "Unanswered", value: Math.max(0, unanswered - marked), fill: "hsl(var(--muted))" },
            ]}
            dataKey="value"
            cx="50%"
            cy="50%"
            innerRadius={36}
            outerRadius={54}
            paddingAngle={2}
            stroke="none"
            isAnimationActive
            animationDuration={600}
          >
            {[0, 1, 2].map((i) => (
              <Cell key={i} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 6,
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-xl font-bold tabular-nums">
          {Math.round((answered / Math.max(1, total)) * 100)}%
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">complete</div>
      </div>
    </div>
  );
}
