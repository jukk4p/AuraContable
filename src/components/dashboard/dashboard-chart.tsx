"use client";

import React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

interface DashboardChartProps {
    data: any[];
    config: ChartConfig;
}

export default function DashboardChart({ data, config }: DashboardChartProps) {
    return (
        <ChartContainer config={config} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="fillIngresos" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.08}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="fillGastos" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--danger))" stopOpacity={0.08}/>
                            <stop offset="95%" stopColor="hsl(var(--danger))" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.5} stroke="hsl(var(--border))" />
                    <XAxis
                        dataKey="name"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        className="text-xs text-muted-foreground font-medium"
                    />
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        className="text-[10px] text-muted-foreground"
                        tickFormatter={(value) => `${value / 1000}k`}
                    />
                    <ChartTooltip cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }} content={<ChartTooltipContent indicator="line" />} />
                    <Area 
                        type="monotone" 
                        dataKey="ingresos" 
                        stroke="hsl(var(--primary))" 
                        fill="url(#fillIngresos)"
                        strokeWidth={2} 
                        activeDot={{ r: 4, strokeWidth: 0, fill: "hsl(var(--primary))" }}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="gastos" 
                        stroke="hsl(var(--danger))" 
                        fill="url(#fillGastos)"
                        strokeWidth={2} 
                        activeDot={{ r: 4, strokeWidth: 0, fill: "hsl(var(--danger))" }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </ChartContainer>
    );
}
