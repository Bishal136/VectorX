import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import Logo from '../common/Logo';
import { ShieldCheck, Mail, Send } from 'lucide-react';

const Footer = () => {
  const [email, setEmail] = useState('');

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    toast.success('Thank you for subscribing to Dealport newsletter!');
    setEmail('');
  };

  return (
    <footer className="bg-[#EBF7EE] text-slate-700 pt-14 pb-8 border-t border-emerald-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Main 4-Column Navigation Grid + Center Brand */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 items-start">
          {/* Col 1: Company Info */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs sm:text-sm text-slate-900 tracking-tight">
              Company Info
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>
                <Link to="/about" className="hover:text-emerald-700 transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/careers" className="hover:text-emerald-700 transition">
                  Careers
                </Link>
              </li>
              <li>
                <Link to="/press" className="hover:text-emerald-700 transition">
                  Press Releases
                </Link>
              </li>
              <li>
                <Link to="/sustainability" className="hover:text-emerald-700 transition">
                  Sustainability Practices
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 2: Customer Support */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs sm:text-sm text-slate-900 tracking-tight">
              Customer Support
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>
                <Link to="/contact" className="hover:text-emerald-700 transition">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/support/faq" className="hover:text-emerald-700 transition">
                  Help Center (FAQs)
                </Link>
              </li>
              <li>
                <Link to="/profile" className="hover:text-emerald-700 transition">
                  Track My Order
                </Link>
              </li>
              <li>
                <Link to="/support/refunds" className="hover:text-emerald-700 transition">
                  Return & Refund Policy
                </Link>
              </li>
              <li>
                <Link to="/support/shipping-returns" className="hover:text-emerald-700 transition">
                  Shipping Information
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Center Brand Logo (Desktop) */}
          <div className="hidden lg:flex flex-col items-center justify-center space-y-2 pt-2">
            <Logo size="md" />
            <p className="text-[11px] text-slate-500 text-center max-w-[180px] leading-relaxed">
              Your one-stop destination for authentic deals & daily savings.
            </p>
          </div>

          {/* Col 4: Explore */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs sm:text-sm text-slate-900 tracking-tight">
              Explore
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>
                <Link to="/products" className="hover:text-emerald-700 transition">
                  Categories
                </Link>
              </li>
              <li>
                <Link to="/products?sort=popularity" className="hover:text-emerald-700 transition">
                  Bestsellers
                </Link>
              </li>
              <li>
                <Link to="/products?sort=newest" className="hover:text-emerald-700 transition">
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link to="/promotions" className="hover:text-emerald-700 transition">
                  Deals & Promotions
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 5: Legal */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs sm:text-sm text-slate-900 tracking-tight">
              Legal
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>
                <Link to="/terms" className="hover:text-emerald-700 transition">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-emerald-700 transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="hover:text-emerald-700 transition">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link to="/accessibility" className="hover:text-emerald-700 transition">
                  Accessibility Statement
                </Link>
              </li>
              <li>
                <Link to="/support/refunds" className="hover:text-emerald-700 transition">
                  Return & Refund Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter Signup Strip & Social Connect */}
        <div className="pt-8 border-t border-emerald-200/60 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Newsletter */}
          <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-3">
            <span className="text-xs font-bold text-slate-800 shrink-0">
              Newsletter Signup
            </span>
            <form onSubmit={handleSubscribe} className="flex items-center w-full sm:w-auto">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="bg-white border border-emerald-300 rounded-l-full px-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 w-full sm:w-64"
              />
              <button
                type="submit"
                className="bg-white hover:bg-emerald-700 hover:text-white text-emerald-800 border border-emerald-300 border-l-0 rounded-r-full px-5 py-2 text-xs font-bold transition cursor-pointer shadow-2xs"
              >
                Subscribe
              </button>
            </form>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-slate-800">Connect with us</span>
            <div className="flex items-center gap-2.5">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="w-7 h-7 rounded-full bg-emerald-800 text-white flex items-center justify-center hover:bg-emerald-900 transition shadow-2xs"
                aria-label="Facebook"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-7 h-7 rounded-full bg-emerald-800 text-white flex items-center justify-center hover:bg-emerald-900 transition shadow-2xs"
                aria-label="Instagram"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                className="w-7 h-7 rounded-full bg-emerald-800 text-white flex items-center justify-center hover:bg-emerald-900 transition shadow-2xs"
                aria-label="Twitter / X"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="w-7 h-7 rounded-full bg-emerald-800 text-white flex items-center justify-center hover:bg-emerald-900 transition shadow-2xs"
                aria-label="LinkedIn"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Trust */}
        <div className="pt-6 border-t border-emerald-200/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} Dealport. All rights reserved</p>
          <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Trusted Seller Certifications by SSL Secure</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;