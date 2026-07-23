import React, { useState, useEffect } from 'react';
import { Users, AlertCircle } from 'lucide-react';
import { User } from '../types';
import gfgLogo from '/favicon.png';

// The parseCSV function is needed again to process the file
const parseCSV = (csvText: string): any[] => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const obj: any = {};
    headers.forEach((header, i) => {
      obj[header] = values[i];
    });
    return obj;
  });
};

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [organizers, setOrganizers] = useState<any[]>([]);

  // useEffect is added back to fetch the Organizers.csv file on component load
  useEffect(() => {
    const loadOrganizers = async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}Organizers.csv`);
        if (response.ok) {
          const organizersText = await response.text();
          setOrganizers(parseCSV(organizersText));
        } else {
          console.error("Failed to fetch Organizers.csv");
        }
      } catch (err) {
        console.error("Error loading Organizers.csv", err);
      }
    };
    loadOrganizers();
  }, []);

  // handleSubmit now checks the email against the state populated from the CSV
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const organizer = organizers.find(o => o.email && o.email.toLowerCase() === email.trim().toLowerCase());

    if (organizer) {
      onLogin({
        id: email.split('@')[0],
        email: email,
        role: 'organizer',
        name: organizer.name || email.split('@')[0],
      });
    } else {
      setError('Organizer not found or not authorized.');
    }
    setIsLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden responsive-bg"
    >
      <div className="relative z-10 w-full max-w-md px-2 sm:px-4 mx-auto">
        <div className="text-center mb-8">
          <div className="mb-4">
            <img src={gfgLogo} alt="GFG Logo" className="mx-auto h-24 sm:h-28" />
          </div>
          <p className="text-white font-bold drop-shadow-[0_4px_4px_rgba(0,0,0,1)] text-lg font-body uppercase tracking-widest mb-2 animate-slide-up delay-200">GFG CAMPUS BODY KARE PRESENTS</p>
          <div className="relative w-[380px] h-[190px] mx-auto mb-0 sm:mb-8 mt-6 text-gfg-text-light animate-slide-up delay-300 transform scale-[0.75] sm:scale-100 origin-top">
            {/* Out part */}
            <div className="absolute top-0 left-0 flex items-end z-10">
              <div className="element-box">
                <span className="element-number">8</span>
                <span className="element-symbol">O</span>
              </div>
              <span className="font-bold ml-2 mb-[20px] tracking-tight text-white drop-shadow-md" style={{ fontSize: '65px', fontFamily: "'Times New Roman', Times, serif", lineHeight: "0.75" }}>ut</span>
            </div>

            {/* Break part */}
            <div className="absolute top-[95px] left-[95px] flex items-end z-20">
              <div className="element-box">
                <span className="element-number">35</span>
                <span className="element-symbol">Br</span>
              </div>
              <span className="font-bold ml-2 mb-[20px] tracking-tight text-white drop-shadow-md" style={{ fontSize: '65px', fontFamily: "'Times New Roman', Times, serif", lineHeight: "0.75" }}>eak'26</span>
            </div>
          </div>
          <p className="text-white font-bold drop-shadow-[0_4px_4px_rgba(0,0,0,1)] text-lg font-body uppercase tracking-widest mb-2">ATTENDANCE SYSTEM</p>
        </div>
        <div className="bg-gfg-card-bg rounded-lg shadow-2xl border border-gfg-border overflow-hidden glass-panel">
          <div className="bg-gradient-to-r from-gfg-red to-gfg-red-hover p-4">
            <h2 className="text-xl font-bold text-gfg-text-light text-center font-heading tracking-widest uppercase">ORGANIZER ACCESS</h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-body font-medium text-gfg-text-dark mb-2 tracking-wide">ORGANIZER EMAIL</label>
              <input
                type="email" id="email" value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-gfg-dark-bg border border-gfg-border rounded-lg text-gfg-text-light placeholder-gfg-text-dark focus:border-gfg-gold focus:ring-1 focus:ring-gfg-gold outline-none transition-colors"
                placeholder="your_regno@klu.ac.in"
                disabled={isLoading}
              />
            </div>
            {error && (
              <div className="flex items-center space-x-2 text-gfg-gold bg-gfg-gold/10 p-3 rounded-lg border border-gfg-gold/20">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-body">{error}</span>
              </div>
            )}
            <button type="submit" disabled={isLoading}
              className="w-full bg-gfg-gold hover:bg-gfg-gold-hover text-gfg-card-bg py-3 px-4 rounded-lg font-bold font-heading hover:shadow-lg uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? 'VERIFYING...' : 'LOGIN'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

