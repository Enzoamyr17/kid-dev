"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Building2, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface Company {
  id: string;
  companyName: string;
}

interface CompanySearchInputProps {
  value: string; // Company name text
  selectedCompanyId?: string | null; // Selected company ID if choosing from list
  onChange: (companyName: string, companyId?: string) => void;
  companies: Company[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CompanySearchInput({
  value,
  selectedCompanyId,
  onChange,
  companies,
  placeholder = "Search or enter company name...",
  disabled = false,
  className = "",
}: CompanySearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // Track if component is mounted (for portal)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter companies based on input value
  useEffect(() => {
    if (value.trim() === "") {
      setFilteredCompanies(companies);
    } else {
      const filtered = companies.filter((company) =>
        company.companyName.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCompanies(filtered);
    }
  }, [value, companies]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (newValue: string) => {
    onChange(newValue, undefined); // Clear selected company when typing
    if (!isOpen) {
      updateDropdownPosition();
    }
    setIsOpen(true);
  };

  const handleSelectCompany = (company: Company) => {
    onChange(company.companyName, company.id);
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    updateDropdownPosition();
    setIsOpen(true);
  };

  const updateDropdownPosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  // Update position when opening or on scroll/resize
  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
      return () => {
        window.removeEventListener('scroll', updateDropdownPosition, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  }, [isOpen]);

  const dropdownContent = isOpen && !disabled && mounted && (
    <div
      ref={dropdownRef}
      style={{
        position: 'absolute',
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: `${dropdownPosition.width}px`,
        zIndex: 9999,
      }}
      className="mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto"
    >
      {filteredCompanies.length > 0 ? (
        <ul className="py-1">
          {filteredCompanies.map((company) => (
            <li
              key={company.id}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectCompany(company);
              }}
              className={`px-3 py-2 cursor-pointer hover:bg-muted transition-colors ${
                selectedCompanyId === company.id ? "bg-muted" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{company.companyName}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : value.trim() !== "" ? (
        <div className="px-3 py-4 text-sm text-muted-foreground text-center">
          <div className="flex flex-col items-center gap-2">
            <Building2 className="h-8 w-8 text-muted-foreground/50" />
            <p>No matching companies found</p>
            <p className="text-xs">
              Press Enter to create &quot;{value}&quot;
            </p>
          </div>
        </div>
      ) : (
        <div className="px-3 py-4 text-sm text-muted-foreground text-center">
          Start typing to search companies...
        </div>
      )}
    </div>
  );

  return (
    <>
      <div ref={containerRef} className={`relative ${className}`}>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={handleInputFocus}
            disabled={disabled}
            className="pl-10 pr-10 h-8"
          />
          <ChevronDown
            className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-transform pointer-events-none ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {/* Portal dropdown */}
      {mounted && dropdownContent && createPortal(dropdownContent, document.body)}
    </>
  );
}
