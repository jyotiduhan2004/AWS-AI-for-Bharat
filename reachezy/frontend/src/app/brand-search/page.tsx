'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getUserSession } from '@/lib/auth';
import { INDUSTRIES } from '@/lib/constants';
import BrandCard from '@/components/BrandCard';
import AppNavbar from '@/components/AppNavbar';

interface Brand {
  user_id: string;
  company_name: string;
  industry: string;
  city: string;
  contact_name: string;
}

type SortOption = 'name_asc' | 'name_desc';

const PAGE_SIZE = 20;

export default function BrandSearchPage() {
  const router = useRouter();
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [industryFilter, setIndustryFilter] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name_asc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const session = getUserSession();
    if (!session) {
      router.replace('/login');
    }
  }, [router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAllBrands();
      setAllBrands(data.brands || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) {
      loadData();
      return;
    }
    setLoading(true);
    try {
      const data = await api.searchBrands(q);
      setAllBrands(data.brands || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setPage(1);
    }
  };

  const filtered = useMemo(() => {
    let list = [...allBrands];

    if (industryFilter) {
      list = list.filter((b) => b.industry === industryFilter);
    }
    if (cityFilter.trim()) {
      const q = cityFilter.trim().toLowerCase();
      list = list.filter((b) => b.city?.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      const nameA = a.company_name || '';
      const nameB = b.company_name || '';
      if (sortBy === 'name_asc') return nameA.localeCompare(nameB);
      return nameB.localeCompare(nameA);
    });

    return list;
  }, [allBrands, industryFilter, cityFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [industryFilter, cityFilter, sortBy]);

  const pillClass = (active: boolean) =>
    `rounded-full px-2.5 py-1 text-xs transition-colors cursor-pointer ${
      active
        ? 'bg-primary-100 font-medium text-primary-700'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNavbar />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Find Brands</h1>
          <p className="mt-1 text-gray-600">
            Discover brands looking to collaborate with creators
          </p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar Filters */}
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-8 space-y-6">
              {/* Search */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Search
                </h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSearch();
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search brands..."
                    className="input-field flex-1 text-sm"
                  />
                  <button type="submit" className="btn-primary shrink-0 px-3 text-sm">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                  </button>
                </form>
              </div>

              {/* Industry */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Industry
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setIndustryFilter(null)}
                    className={pillClass(!industryFilter)}
                  >
                    All
                  </button>
                  {INDUSTRIES.map((industry) => (
                    <button
                      key={industry}
                      onClick={() =>
                        setIndustryFilter(
                          industryFilter === industry ? null : industry
                        )
                      }
                      className={pillClass(industryFilter === industry)}
                    >
                      {industry}
                    </button>
                  ))}
                </div>
              </div>

              {/* City */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  City
                </h3>
                <input
                  type="text"
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  placeholder="Filter by city..."
                  className="input-field w-full text-sm"
                />
              </div>

              {/* Sort */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Sort By
                </h3>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="input-field w-full text-sm"
                >
                  <option value="name_asc">Name A-Z</option>
                  <option value="name_desc">Name Z-A</option>
                </select>
              </div>
            </div>
          </aside>

          {/* Results Grid */}
          <div className="min-w-0 flex-1">
            {loading ? (
              <div className="py-16 text-center">
                <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
                <p className="text-gray-600">Loading brands...</p>
              </div>
            ) : (
              <>
                <p className="mb-4 text-sm text-gray-500">
                  {filtered.length} brand{filtered.length !== 1 ? 's' : ''} found
                </p>

                {filtered.length === 0 ? (
                  <div className="py-16 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                    </svg>
                    <p className="mt-4 text-gray-500">No brands match your filters</p>
                    <p className="text-sm text-gray-400">Try adjusting your criteria</p>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {paginated.map((brand) => (
                        <BrandCard key={brand.user_id} brand={brand} />
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="mt-8 flex items-center justify-center gap-4">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="btn-secondary text-sm disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-gray-500">
                          Page {page} of {totalPages}
                        </span>
                        <button
                          onClick={() =>
                            setPage((p) => Math.min(totalPages, p + 1))
                          }
                          disabled={page === totalPages}
                          className="btn-secondary text-sm disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
