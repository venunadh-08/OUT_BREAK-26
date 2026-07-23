import React, { useState } from 'react';
import { Search, Clock, Users } from 'lucide-react';
import { AttendanceRecord } from '../types';

interface AttendanceTableProps {
  records: AttendanceRecord[];
}

const AttendanceTable: React.FC<AttendanceTableProps> = ({ records }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRecords = searchTerm 
    ? records.filter(record => 
        record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.regNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.team.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const getSessionStatus = (record: AttendanceRecord, sessionId: number): boolean => {
    switch (sessionId) {
      case 1: return record.session1;
      case 2: return record.session2;
      case 3: return record.session3;
      default: return false;
    }
  };

  return (
    <div className="bg-gfg-card-bg rounded-lg border border-gfg-border overflow-hidden font-body">
      <div className="p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gfg-text-dark" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Name,Reg No, or Team"
            className="w-full pl-10 pr-4 py-2 bg-gfg-dark-bg border border-gfg-border rounded-lg text-gfg-text-light placeholder-gfg-text-dark focus:border-gfg-gold focus:ring-1 focus:ring-gfg-gold outline-none"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm md:text-base">
          <thead className="bg-gfg-dark-bg/50">
            <tr>
              <th className="text-left p-2 md:p-4 text-gfg-text-dark font-semibold uppercase tracking-wider">Participant</th>
              <th className="text-center p-2 md:p-4 text-gfg-text-dark font-semibold">S1</th>
              <th className="text-center p-2 md:p-4 text-gfg-text-dark font-semibold">S2</th>
              <th className="text-center p-2 md:p-4 text-gfg-text-dark font-semibold">S3</th>
              <th className="hidden md:table-cell text-center p-4 text-gfg-text-dark font-semibold uppercase tracking-wider">Last Updated</th>
            </tr>
          </thead>
          {searchTerm && (
            <tbody className="divide-y divide-gfg-border">
              {filteredRecords.map((record) => (
                <tr key={record.userId} className="hover:bg-gfg-dark-bg/50">
                  <td className="p-2 md:p-4">
                    <div>
                      <div className="text-gfg-text-light font-medium whitespace-nowrap">{record.name}</div>
                      <div className="text-gfg-text-dark text-xs md:text-sm">{record.regNo}</div>
                      <div className="text-gfg-gold text-xs mt-1">{record.team}</div>
                    </div>
                  </td>
                  {[1, 2, 3].map((sessionId) => {
                    const isPresent = getSessionStatus(record, sessionId);
                    return (
                      <td key={sessionId} className="p-2 md:p-4 text-center">
                        <span 
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            isPresent ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-500'
                          }`}
                        >
                          {isPresent ? 'PRESENT' : 'ABSENT'}
                        </span>
                      </td>
                    );
                  })}
                  <td className="hidden md:table-cell p-4 text-center">
                    <div className="flex items-center justify-center text-gfg-text-dark text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(record.lastUpdated).toLocaleString()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          )}
        </table>
        {!searchTerm && (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 mx-auto text-gfg-border mb-4" />
            <div className="text-gfg-text-dark font-body">Enter a search term to find participant records.</div>
          </div>
        )}
        {searchTerm && filteredRecords.length === 0 && (
          <div className="p-8 text-center text-gfg-text-dark font-body">No participants found matching your query.</div>
        )}
      </div>
    </div>
  );
};

export default AttendanceTable;