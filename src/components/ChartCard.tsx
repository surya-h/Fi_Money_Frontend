import { Line } from "react-chartjs-2";
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Legend } from "chart.js";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Legend);

export function ChartCard() {
  const data = {
    labels: ["Now", "1 yr", "5 yr", "10 yr", "Age 40"],
    datasets: [
      {
        label: "Scenario A",
        data: [1, 5, 15, 40, 50],
        borderColor: "#00E676",
        backgroundColor: "#00E676",
      },
      {
        label: "Scenario B",
        data: [1, 6, 20, 45, 55],
        borderColor: "#B39DDB",
        backgroundColor: "#B39DDB",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true },
    },
  };

  return (
    <div className="my-4 p-4 bg-card rounded-xl shadow-md" style={{ height: 300 }}>
      <Line data={data} options={options} />
    </div>
  );
}