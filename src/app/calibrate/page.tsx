import { notFound } from "next/navigation";
import CalibrationGrid from "@/components/CalibrationGrid";
export const metadata = { title: "Calibration" };
export default function CalibratePage() {
    if (process.env.ENABLE_CALIBRATION !== "1")
        notFound();
    return <CalibrationGrid />;
}
