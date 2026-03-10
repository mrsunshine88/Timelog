'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { useState, useEffect } from 'react';

const initialData = [
  { name: 'Mon', total: 0 },
  { name: 'Tue', total: 0 },
  { name: 'Wed', total: 0 },
  { name: 'Thu', total: 0 },
  { name: 'Fri', total: 0 },
  { name: 'Sat', total: 0 },
  { name: 'Sun', total: 0 },
];


export function OverviewChart() {
    const [data, setData] = useState(initialData);

    useEffect(() => {
        setData([
            { name: 'Mon', total: Math.floor(Math.random() * 8) + 1 },
            { name: 'Tue', total: Math.floor(Math.random() * 8) + 1 },
            { name: 'Wed', total: Math.floor(Math.random() * 8) + 1 },
            { name: 'Thu', total: Math.floor(Math.random() * 8) + 1 },
            { name: 'Fri', total: Math.floor(Math.random() * 8) + 1 },
            { name: 'Sat', total: Math.floor(Math.random() * 2) },
            { name: 'Sun', total: Math.floor(Math.random() * 2) },
          ]);
    }, [])

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}h`}
        />
        <Bar
          dataKey="total"
          fill="hsl(var(--primary))"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
