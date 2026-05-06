'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, Input, Button } from '@ridendine/ui';

const cuisineTypes = [
  'Mexican', 'Italian', 'Thai', 'Indian', 'Chinese',
  'Japanese', 'American', 'Mediterranean', 'Southern', 'Vegan',
];

const sortOptions = [
  { value: 'default', label: 'Featured' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest' },
] as const;

export function ChefsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(
    searchParams.getAll('cuisine')
  );
  const [minRating, setMinRating] = useState(searchParams.get('rating') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'default');

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    selectedCuisines.forEach((c) => params.append('cuisine', c));
    if (minRating) params.set('rating', minRating);
    if (sortBy && sortBy !== 'default') params.set('sort', sortBy);
    router.push(`/chefs?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedCuisines([]);
    setMinRating('');
    setSortBy('default');
    router.push('/chefs');
  };

  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines((prev) =>
      prev.includes(cuisine) ? prev.filter((c) => c !== cuisine) : [...prev, cuisine]
    );
  };

  return (
    <Card>
      <h3 className="font-semibold text-gray-900">Filters</h3>

      <div className="mt-4">
        <Input
          placeholder="Search chefs, cuisines..."
          className="w-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
        />
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-700">Sort By</h4>
        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value);
          }}
          className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#E85D26] focus:outline-none focus:ring-1 focus:ring-[#E85D26]"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-700">Cuisine Type</h4>
        <div className="mt-2 space-y-2">
          {cuisineTypes.map((cuisine) => (
            <label key={cuisine} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedCuisines.includes(cuisine)}
                onChange={() => toggleCuisine(cuisine)}
                className="h-4 w-4 rounded border-gray-300 text-[#E85D26] focus:ring-[#E85D26]"
              />
              <span className="text-sm text-gray-600">{cuisine}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-700">Rating</h4>
        <div className="mt-2 space-y-2">
          {[4.5, 4.0, 3.5].map((rating) => (
            <label key={rating} className="flex items-center gap-2">
              <input
                type="radio"
                name="rating"
                checked={minRating === String(rating)}
                onChange={() => setMinRating(String(rating))}
                className="h-4 w-4 border-gray-300 text-[#E85D26] focus:ring-[#E85D26]"
              />
              <span className="text-sm text-gray-600">{rating}+ stars</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <Button onClick={applyFilters} className="w-full">
          Apply Filters
        </Button>
        <Button variant="outline" onClick={clearFilters} className="w-full">
          Clear Filters
        </Button>
      </div>
    </Card>
  );
}
