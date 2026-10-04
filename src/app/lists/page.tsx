"use client";
import { motion } from "framer-motion";
import ListsView from "@/components/ListsView";
import { FADE_UP, staggerContainer } from "@/lib/motion";
export default function ListsPage() {
    return (<motion.div variants={staggerContainer(0.05)} initial="hidden" animate="show" className="px-5 pb-28 pt-6">
      <motion.h1 variants={FADE_UP} className="text-[26px] font-bold tracking-[-0.03em]">
        Lists
      </motion.h1>
      <div className="mt-5">
        <ListsView />
      </div>
    </motion.div>);
}
