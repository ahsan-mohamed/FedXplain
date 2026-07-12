// components/home/AnimatedFlowDiagram.tsx
import { motion } from "framer-motion";

const NODES = [
  { id: "banks", label: "5 Banks", x: 60, sub: "local data" },
  { id: "fedavg", label: "Federated\nLearning", x: 220, sub: "FedAvg" },
  { id: "xgboost", label: "XGBoost", x: 380, sub: "scoring" },
  { id: "explain", label: "SHAP + LLM", x: 540, sub: "explains" },
  { id: "dashboard", label: "Dashboard", x: 700, sub: "analyst" },
];

const Y = 60;
const PATH_D = NODES.slice(0, -1)
  .map((n, i) => `M${n.x + 45},${Y} L${NODES[i + 1].x - 45},${Y}`)
  .join(" ");

export function AnimatedFlowDiagram() {
  return (
    <div className="mx-auto mb-16 max-w-4xl overflow-x-auto">
      <svg viewBox="0 0 760 130" className="w-full min-w-[700px]" fill="none">
        {/* Static connecting line */}
        <path d={PATH_D} stroke="#e5e7eb" strokeWidth="2" />

        {/* Animated traveling dots, staggered, looping */}
        {[0, 1, 2].map((i) => (
          <motion.circle
            key={i}
            cy={Y}
            r="4"
            fill="#0f1b3d"
            initial={{ cx: NODES[0].x }}
            animate={{ cx: NODES[NODES.length - 1].x }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "linear",
              delay: i * 1.4,
            }}
          />
        ))}

        {/* Nodes */}
        {NODES.map((node, i) => (
          <g key={node.id}>
            <motion.circle
              cx={node.x}
              cy={Y}
              r="34"
              fill="white"
              stroke="#0f1b3d"
              strokeWidth="1.5"
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.12 }}
            />
            <motion.text
              x={node.x}
              y={Y - 2}
              textAnchor="middle"
              fontSize="9"
              fontWeight="600"
              fill="#111111"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.12 + 0.15 }}
            >
              {node.label.split("\n").map((line, li) => (
                <tspan key={li} x={node.x} dy={li === 0 ? 0 : 11}>
                  {line}
                </tspan>
              ))}
            </motion.text>
            <motion.text
              x={node.x}
              y={Y + 50}
              textAnchor="middle"
              fontSize="8"
              fill="#9ca3af"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.12 + 0.2 }}
            >
              {node.sub}
            </motion.text>
          </g>
        ))}
      </svg>
    </div>
  );
}
