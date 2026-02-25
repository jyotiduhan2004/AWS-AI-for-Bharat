'use client';

interface TopicCloudProps {
  topics: string[];
}

const COLORS = [
  'bg-primary-100 text-primary-700',
  'bg-purple-100 text-purple-700',
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-teal-100 text-teal-700',
  'bg-amber-100 text-amber-700',
  'bg-cyan-100 text-cyan-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
];

const SIZE_CLASSES = [
  'text-base px-4 py-2 font-semibold',
  'text-sm px-3.5 py-1.5 font-medium',
  'text-sm px-3 py-1.5 font-medium',
  'text-xs px-3 py-1 font-medium',
  'text-xs px-2.5 py-1 font-normal',
];

export default function TopicCloud({ topics }: TopicCloudProps) {
  if (!topics || topics.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-gray-400">
        No topics detected yet.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {topics.map((topic, idx) => {
        const sizeIndex = Math.min(idx, SIZE_CLASSES.length - 1);
        const colorIndex = idx % COLORS.length;

        return (
          <span
            key={topic}
            className={`inline-flex items-center rounded-full transition-transform hover:scale-105 ${COLORS[colorIndex]} ${SIZE_CLASSES[sizeIndex]}`}
          >
            {topic}
          </span>
        );
      })}
    </div>
  );
}
