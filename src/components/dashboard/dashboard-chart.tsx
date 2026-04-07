"use client";

import React from "react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

interface DashboardChartProps {
    data: any[];
    config: ChartConfig;
}

export default function DashboardChart({ data, config }: DashboardChartProps) {
    return (
        <ChartContainer config={config} className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 20, right: 20, left: 10 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.05} />
                    <XAxis
                        dataKey="name"
                        tickLine={false}
                        tickMargin={15}
                        axisLine={false}
                        className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground"
                    />
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={15}
                        className="font-mono text-[10px] font-bold text-muted-foreground opacity-50"
                    />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <Line 
                        type="monotone" 
                        dataKey="ingresos" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={4} 
                        dot={{ r: 6, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "white" }} 
                        activeDot={{ r: 8, strokeWidth: 0 }}
                        animationDuration={2000}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="gastos" 
                        stroke="hsl(var(--destructive))" 
                        strokeWidth={4} 
                        dot={{ r: 6, fill: "hsl(var(--destructive))", strokeWidth: 2, stroke: "white" }}
                        activeDot={{ r: 8, strokeWidth: 0 }}
                        animationDuration={2000}
                    />
                </LineChart>
            </ResponsiveContainer>
        </ChartContainer>
    );
}
