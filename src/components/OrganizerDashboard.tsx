import React, { useState, useEffect, useRef } from 'react';
import { Users, Download, LogOut, UserCheck, Hash, AlertCircle, ScanLine, Clock, FileSpreadsheet } from 'lucide-react';
import { User as UserType, AttendanceRecord, Session } from '../types';
import AttendanceTable from './AttendanceTable';
import QRScanner from './QRScanner';
import { db } from '../firebase';
import { ref, onValue, set, Unsubscribe } from 'firebase/database';
import * as XLSX from 'xlsx';

// ... (keep the parseCSV function as it is)
const parseCSV = (csvText: string): Omit<AttendanceRecord, 'session1' | 'session2' | 'session3' | 'lastUpdated' | 'userId'>[] => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const regNoIndex = headers.indexOf('regno');
    const nameIndex = headers.indexOf('name');
    const emailIndex = headers.indexOf('email');
    const teamIndex = headers.indexOf('team');
    if (regNoIndex === -1) {
        console.error("CSV Parse Error: 'RegNo' header not found.");
        return [];
    }
    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        return {
            regNo: values[regNoIndex] || '',
            name: values[nameIndex] || '',
            email: values[emailIndex] || '',
            team: values[teamIndex] || '',
        };
    }).filter(p => p.regNo);
};


interface OrganizerDashboardProps {
    user: UserType;
    onLogout: () => void;
}

const OrganizerDashboard: React.FC<OrganizerDashboardProps> = ({ user, onLogout }) => {
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [sessions] = useState<Session[]>([]);
    const [manualRegNo, setManualRegNo] = useState('');
    const [selectedSession, setSelectedSession] = useState<number | ''>('');
    const [manualEntryMessage, setManualEntryMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [scanResult, setScanResult] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
    const [isProcessingScan, setIsProcessingScan] = useState(false);
    const [exportSession, setExportSession] = useState<number | 'all'>(1);
    const [activeTab, setActiveTab] = useState<'scan' | 'manual' | 'table'>('scan');

    // Refs to control the scanner component
    const scannerStartRef = useRef<() => void>(() => { });
    const scannerStopRef = useRef<() => void>(() => { });
    const scannerPauseRef = useRef<() => void>(() => { });
    const scannerResumeRef = useRef<() => void>(() => { });

    useEffect(() => {
        // ... (keep the useEffect for firebase data loading as it is)
        const attendanceRef = ref(db, 'attendance');
        const unsubscribe: Unsubscribe = onValue(attendanceRef, (snapshot) => {
            const dbData = snapshot.val();
            if (dbData) {
                setAttendanceRecords(Object.values(dbData) as AttendanceRecord[]);
            } else {
                loadFromCSVAndSeedDatabase();
            }
        });
        const loadFromCSVAndSeedDatabase = async () => {
            try {
                const response = await fetch(`${import.meta.env.BASE_URL}Participants.csv`);
                if (!response.ok) return;
                const csvText = await response.text();
                const parsedData = parseCSV(csvText);
                if (parsedData.length > 0) {
                    const participants = parsedData.map(p => ({
                        ...p, userId: p.regNo,
                        session1: false, session2: false, session3: false,
                        lastUpdated: new Date().toISOString()
                    }));
                    await set(attendanceRef, participants);
                }
            } catch (error) {
                console.error('Error loading from CSV:', error);
            }
        };
        return () => unsubscribe();
    }, []);

    const handleScan = (scannedText: string) => {
        if (isProcessingScan || selectedSession === '') return;
        setIsProcessingScan(true);

        const participant = attendanceRecords.find(p => p.regNo === scannedText.trim());
        let shouldPause = false;

        if (!participant) {
            setScanResult({ type: 'error', text: `Participant with ID "${scannedText}" not found.` });
        } else {
            const sessionKey = `session${selectedSession}` as keyof AttendanceRecord;
            if (participant[sessionKey] === true) {
                setScanResult({ type: 'warning', text: `${participant.name} is already marked as PRESENT.` });
                shouldPause = true;
            } else {
                // This is a successful scan
                handleAttendanceUpdate(participant.userId, selectedSession as number, true);
                setScanResult({ type: 'success', text: `Success! ${participant.name} marked PRESENT.` });
                shouldPause = true;
            }
        }

        if (shouldPause) {
            scannerPauseRef.current();
        }

        // Timer to clear message and allow scanning again
        setTimeout(() => {
            setScanResult(null);
            setIsProcessingScan(false);
            if (shouldPause && activeTab === 'scan') {
                scannerResumeRef.current();
            }
        }, 1500);
    };

    // ... (keep handleAttendanceUpdate, handleManualEntry, exportToCSV functions as they are)
    const handleAttendanceUpdate = async (userId: string, session: number, present: boolean) => {
        try {
            let recordIndex = -1;
            const recordToUpdate = attendanceRecords.find((record, index) => {
                if (record.userId === userId) {
                    recordIndex = index;
                    return true;
                }
                return false;
            });
            if (recordIndex !== -1 && recordToUpdate) {
                const updatedRecord = { ...recordToUpdate };
                switch (session) {
                    case 1:
                        updatedRecord.session1 = present;
                        updatedRecord.session1_markedBy = present ? user.email : undefined;
                        break;
                    case 2:
                        updatedRecord.session2 = present;
                        updatedRecord.session2_markedBy = present ? user.email : undefined;
                        break;
                    case 3:
                        updatedRecord.session3 = present;
                        updatedRecord.session3_markedBy = present ? user.email : undefined;
                        break;
                }
                updatedRecord.lastUpdated = new Date().toISOString();
                const recordRef = ref(db, `attendance/${recordIndex}`);
                await set(recordRef, updatedRecord);
            }
        } catch (error) {
            console.error('Error updating attendance record:', error);
        }
    };

    const handleManualEntry = () => {
        setManualEntryMessage(null);
        if (selectedSession === '') {
            setManualEntryMessage({ type: 'error', text: 'Please select a session first.' });
            return;
        }
        if (!manualRegNo.trim()) {
            setManualEntryMessage({ type: 'error', text: 'Registration No. cannot be empty.' });
            return;
        }
        const participant = attendanceRecords.find(record => record.regNo.toLowerCase() === manualRegNo.trim().toLowerCase());
        if (participant) {
            const sessionKey = `session${selectedSession}` as keyof AttendanceRecord;
            if (participant[sessionKey] === true) {
                setManualEntryMessage({ type: 'error', text: `${participant.name} is already marked as PRESENT.` });
            } else {
                handleAttendanceUpdate(participant.userId, selectedSession as number, true);
                setManualEntryMessage({ type: 'success', text: `Success! ${participant.name} marked PRESENT.` });
                setManualRegNo('');
            }
        } else {
            setManualEntryMessage({ type: 'error', text: `Participant with ID "${manualRegNo}" not found.` });
        }
    };

    const exportToCSV = () => {
        let headers: string[];
        let csvContent: string;
        let filename: string;

        if (exportSession === 'all') {
            headers = ['Registration_No', 'Name', 'Email', 'Team', 'Session1_Status', 'Session1_Marked_By', 'Session2_Status', 'Session2_Marked_By', 'Session3_Status', 'Session3_Marked_By', 'Last_Updated'];
            csvContent = [
                headers.join(','),
                ...attendanceRecords.map(record => [
                    record.regNo, `"${record.name}"`, record.email, `"${record.team}"`,
                    record.session1 ? 'Present' : 'Absent', (record.session1_markedBy as string | undefined) || 'N/A',
                    record.session2 ? 'Present' : 'Absent', (record.session2_markedBy as string | undefined) || 'N/A',
                    record.session3 ? 'Present' : 'Absent', (record.session3_markedBy as string | undefined) || 'N/A',
                    new Date(record.lastUpdated).toLocaleString()
                ].join(','))
            ].join('\n');
            filename = `hack-heist-all-sessions-attendance-${new Date().toISOString().split('T')[0]}.csv`;
        } else {
            const sessionStatusKey = `session${exportSession}` as keyof AttendanceRecord;
            const markedByKey = `session${exportSession}_markedBy` as keyof AttendanceRecord;
            headers = ['Registration_No', 'Name', 'Email', 'Team', `session${exportSession}_Status`, 'Marked_By', 'Last_Updated'];
            const sessionAttendees = attendanceRecords.filter(record => record[sessionStatusKey] === true);
            if (sessionAttendees.length === 0) {
                alert(`No participants have been marked PRESENT for Session ${exportSession} yet.`);
                return;
            }
            csvContent = [
                headers.join(','),
                ...sessionAttendees.map(record => [
                    record.regNo, `"${record.name}"`, record.email, `"${record.team}"`, 'Present',
                    (record[markedByKey] as string | undefined) || 'N/A',
                    new Date(record.lastUpdated).toLocaleString()
                ].join(','))
            ].join('\n');
            filename = `hack-heist-review${exportSession}-attendance-${new Date().toISOString().split('T')[0]}.csv`;
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a); a.click();
        window.URL.revokeObjectURL(url); document.body.removeChild(a);
    };

    const exportToExcel = () => {
        let data: any[];
        let sheetName: string;
        let filename: string;

        if (exportSession === 'all') {
            data = attendanceRecords.map(record => ({
                'Registration No': record.regNo,
                'Name': record.name,
                'Email': record.email,
                'Team': record.team,
                'Session 1 Status': record.session1 ? 'Present' : 'Absent',
                'Session 1 Marked By': (record.session1_markedBy as string | undefined) || 'N/A',
                'Session 2 Status': record.session2 ? 'Present' : 'Absent',
                'Session 2 Marked By': (record.session2_markedBy as string | undefined) || 'N/A',
                'Session 3 Status': record.session3 ? 'Present' : 'Absent',
                'Session 3 Marked By': (record.session3_markedBy as string | undefined) || 'N/A',
                'Last Updated': new Date(record.lastUpdated).toLocaleString()
            }));
            sheetName = 'All Sessions';
            filename = `hack-heist-all-sessions-attendance-${new Date().toISOString().split('T')[0]}.xlsx`;
        } else {
            const sessionStatusKey = `session${exportSession}` as keyof AttendanceRecord;
            const markedByKey = `session${exportSession}_markedBy` as keyof AttendanceRecord;
            const sessionAttendees = attendanceRecords.filter(record => record[sessionStatusKey] === true);
            if (sessionAttendees.length === 0) {
                alert(`No participants have been marked PRESENT for Session ${exportSession} yet.`);
                return;
            }

            data = sessionAttendees.map(record => ({
                'Registration No': record.regNo,
                'Name': record.name,
                'Email': record.email,
                'Team': record.team,
                [`Session ${exportSession} Status`]: 'Present',
                'Marked By': (record[markedByKey] as string | undefined) || 'N/A',
                'Last Updated': new Date(record.lastUpdated).toLocaleString()
            }));
            sheetName = `Session ${exportSession}`;
            filename = `hack-heist-review${exportSession}-attendance-${new Date().toISOString().split('T')[0]}.xlsx`;
        }

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        
        XLSX.writeFile(workbook, filename);
    };

    return (
        <div className="min-h-screen font-body relative overflow-x-hidden responsive-bg">
            <div className="glass-panel border-b border-gfg-border sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
                        <div className="flex items-center space-x-4">
                            <div className="text-center sm:text-left">
                                <div className="relative w-[130px] h-[60px] text-gfg-text-light mb-2 mt-1">
                                    {/* Mini Out part */}
                                    <div className="absolute top-0 left-0 flex items-end z-10">
                                        <div className="flex flex-col items-center justify-center relative bg-[#1a4d2e] border-2 border-white w-[30px] h-[30px] shadow-[0_0_10px_rgba(146,64,14,0.4)]">
                                            <span className="absolute top-[1px] right-[2px] text-[8px] font-bold text-white leading-none font-serif">8</span>
                                            <span className="text-[20px] font-bold text-white leading-none font-serif mt-1">O</span>
                                        </div>
                                        <span className="font-bold ml-1 mb-[2px] tracking-tight text-white drop-shadow-md text-[20px] leading-none" style={{ fontFamily: "'Times New Roman', Times, serif" }}>ut</span>
                                    </div>

                                    {/* Mini Break part */}
                                    <div className="absolute top-[30px] left-[30px] flex items-end z-20">
                                        <div className="flex flex-col items-center justify-center relative bg-[#1a4d2e] border-2 border-white w-[30px] h-[30px] shadow-[0_0_10px_rgba(146,64,14,0.4)]">
                                            <span className="absolute top-[1px] right-[2px] text-[8px] font-bold text-white leading-none font-serif">35</span>
                                            <span className="text-[20px] font-bold text-white leading-none font-serif mt-1">Br</span>
                                        </div>
                                        <span className="font-bold ml-1 mb-[2px] tracking-tight text-white drop-shadow-md text-[20px] leading-none" style={{ fontFamily: "'Times New Roman', Times, serif" }}>eak'26</span>
                                    </div>
                                </div>
                                <p className="text-gfg-gold text-xs font-body tracking-widest font-bold ml-1 uppercase">ORGANIZER CONTROL</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end bg-gfg-dark-bg/30 sm:bg-transparent p-2 sm:p-0 rounded-lg">
                            <div className="text-left sm:text-right text-sm">
                                <div className="text-gfg-text-dark">Logged in as</div>
                                <div className="text-gfg-text-light">{user.name || user.email.split('@')[0]}</div>
                            </div>
                            <button onClick={onLogout} className="flex items-center space-x-2 text-gfg-text-dark hover:text-gfg-gold transition-colors uppercase font-body bg-black/20 p-2 rounded-lg sm:bg-transparent sm:p-0">
                                <LogOut className="w-4 h-4" /> <span>Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="max-w-6xl mx-auto px-4 py-6">
                <div className="mb-6 p-4 glass-panel rounded-lg border border-gfg-border flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex items-center text-lg font-semibold text-gfg-text-light font-heading">
                        <Clock className="w-5 h-5 mr-3 text-gfg-gold" />
                        <span className="tracking-wider">Select Session:</span>
                    </div>
                    <select
                        id="session" value={selectedSession}
                        onChange={(e) => setSelectedSession(e.target.value ? Number(e.target.value) : '')}
                        className="w-full sm:w-auto px-4 py-2 bg-[rgba(10,10,10,0.8)] border border-gfg-border rounded-lg text-gfg-text-light focus:border-gfg-gold focus:ring-1 focus:ring-gfg-gold outline-none"
                    >
                        <option value="" disabled>Select Session</option>
                        <option value={1}>Session 1</option>
                        <option value={2}>Session 2</option>
                        <option value={3}>Session 3</option>
                    </select>
                </div>
                {selectedSession === '' ? (
                    <div className="text-center py-12 glass-panel rounded-lg border border-gfg-border bg-black/40 mt-6">
                        <p className="text-gfg-gold font-heading text-xl uppercase tracking-widest mb-2">No Session Selected</p>
                        <p className="text-gfg-text-dark font-body">Please select a session from the dropdown above to manage attendance.</p>
                    </div>
                ) : (
                    <>
                        <div className="border-b border-gfg-border mb-6">
                            <nav className="-mb-px flex space-x-4 sm:space-x-6 font-heading overflow-x-auto pb-1" aria-label="Tabs">
                                <button onClick={() => setActiveTab('scan')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm uppercase tracking-wider ${activeTab === 'scan' ? 'border-black text-black font-bold drop-shadow-md' : 'border-transparent text-black/70 hover:text-black'}`}>
                                    Identity Scan
                                </button>
                                <button onClick={() => setActiveTab('manual')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm uppercase tracking-wider ${activeTab === 'manual' ? 'border-black text-black font-bold drop-shadow-md' : 'border-transparent text-black/70 hover:text-black'}`}>
                                    Manual Entry
                                </button>
                                <button onClick={() => setActiveTab('table')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm uppercase tracking-wider ${activeTab === 'table' ? 'border-black text-black font-bold drop-shadow-md' : 'border-transparent text-black/70 hover:text-black'}`}>
                                    Attendance Table
                                </button>
                            </nav>
                        </div>
                        {activeTab === 'scan' && (
                            <div className="-mt-6">
                                <QRScanner
                                    key={selectedSession}
                                    onScan={handleScan}
                                    scanResult={scanResult}
                                    setStartScanner={(fn) => { scannerStartRef.current = fn; }}
                                    setStopScanner={(fn) => { scannerStopRef.current = fn; }}
                                    setPauseScanner={(fn) => { scannerPauseRef.current = fn; }}
                                    setResumeScanner={(fn) => { scannerResumeRef.current = fn; }}
                                />
                            </div>
                        )}

                        {activeTab === 'manual' && (
                            <div>
                                <div className="max-w-md bg-gfg-card-bg rounded-lg border border-gfg-border p-6 h-fit">
                                    <h3 className="text-gfg-text-light font-bold text-lg mb-4 flex items-center font-heading uppercase tracking-wider"><Hash className="w-5 h-5 mr-2 text-gfg-gold" />Manual Attendance</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="regNo" className="block text-sm font-body font-medium text-gfg-text-dark mb-2">Registration No.</label>
                                            <input type="text" id="regNo" value={manualRegNo} onChange={(e) => setManualRegNo(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleManualEntry()} className="w-full px-3 py-2 bg-gfg-dark-bg border border-gfg-border rounded-lg text-gfg-text-light" placeholder="Enter Registration No." />
                                        </div>
                                        <button onClick={handleManualEntry} className="w-full bg-gfg-gold hover:bg-gfg-gold-hover text-gfg-card-bg py-3 px-4 rounded-lg font-bold font-heading flex items-center justify-center uppercase tracking-wider">
                                            <UserCheck className="w-5 h-5 mr-2" /> Mark Present
                                        </button>
                                        {manualEntryMessage && <div className={`flex items-start space-x-2 p-3 rounded-lg border ${manualEntryMessage.type === 'success' ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-gfg-gold bg-gfg-gold/10 border-gfg-gold/20'}`}><AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span className="text-sm font-body">{manualEntryMessage.text}</span></div>}
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'table' && (
                            <div>
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                                    <h2 className="text-2xl font-bold text-gfg-text-light font-heading tracking-wider">Attendance Records</h2>
                                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                                        <select value={exportSession} onChange={(e) => setExportSession(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="w-full sm:w-auto px-3 py-2 bg-gfg-card-bg border border-gfg-border rounded-lg text-gfg-text-light focus:border-gfg-gold focus:ring-1 focus:ring-gfg-gold outline-none font-body">
                                            <option value="all">Export All Sessions</option>
                                            <option value={1}>Export Session 1</option>
                                            <option value={2}>Export Session 2</option>
                                            <option value={3}>Export Session 3</option>
                                        </select>
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <button onClick={exportToCSV} className="flex-1 sm:flex-none flex items-center justify-center space-x-1 bg-gfg-dark-bg border border-gfg-border hover:bg-gfg-border text-gfg-text-light px-3 py-2 rounded-lg transition-colors uppercase font-heading text-sm whitespace-nowrap"><Download className="w-4 h-4" /><span>CSV</span></button>
                                            <button onClick={exportToExcel} className="flex-1 sm:flex-none flex items-center justify-center space-x-1 bg-gfg-gold hover:bg-gfg-gold-hover text-gfg-card-bg px-3 py-2 rounded-lg transition-colors uppercase font-heading text-sm font-bold whitespace-nowrap"><FileSpreadsheet className="w-4 h-4" /><span>Excel</span></button>
                                        </div>
                                    </div>
                                </div>
                                {attendanceRecords.length === 0 ? <div className="text-center py-10 bg-gfg-card-bg rounded-lg"><p className="text-gfg-text-dark font-body">Loading attendance data...</p></div> : <AttendanceTable records={attendanceRecords} />}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default OrganizerDashboard;