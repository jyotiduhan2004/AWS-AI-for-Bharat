'use client';

import { useState } from 'react';
import { NICHES } from '@/lib/constants';

interface NicheSelectorProps {
  value: string;
  onChange: (niche: string) => void;
}

export default function NicheSelector({ value, onChange }: NicheSelectorProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customNiche, setCustomNiche] = useState('');

  const isCustom = showCustom || (value && !NICHES.includes(value as typeof NICHES[number]));

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === '__others__') {
      setShowCustom(true);
      onChange(customNiche);
    } else {
      setShowCustom(false);
      setCustomNiche('');
      onChange(selected);
    }
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomNiche(val);
    onChange(val);
  };

  return (
    <div className="space-y-2">
      <select
        value={isCustom ? '__others__' : value}
        onChange={handleSelectChange}
        className="input-field"
        required
      >
        <option value="" disabled>
          Select your niche
        </option>
        {NICHES.map((niche) => (
          <option key={niche} value={niche}>
            {niche}
          </option>
        ))}
        <option value="__others__">Others</option>
      </select>

      {isCustom && (
        <input
          type="text"
          placeholder="Enter your niche (e.g. Pet Care, DIY Crafts)"
          value={customNiche || (value && !NICHES.includes(value as typeof NICHES[number]) ? value : '')}
          onChange={handleCustomChange}
          className="input-field"
          required
          autoFocus
        />
      )}
    </div>
  );
}
