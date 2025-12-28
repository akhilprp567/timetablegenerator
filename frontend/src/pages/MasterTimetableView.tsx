import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Calendar, Users, BookOpen, Building2, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";

export default function MasterTimetableView() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [masterData, setMasterData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    fetchMasterTimetable();
  }, []);

  const fetchMasterTimetable = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://127.0.0.1:8000/timetable/master/`,
        {
          headers: { 'Authorization': token ? `Token ${token}` : '' }
        }
      );
      setMasterData(response.data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }
      setError("Failed to load master timetable");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!masterData) return;
    
    const printContent = generateMasterPrintHTML();
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups for PDF download");
      return;
    }
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  const generateMasterPrintHTML = () => {
    const days = masterData?.days || [];
    const periods = masterData?.periods || [];
    const masterTimetable = masterData?.master_timetable || {};

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Master Timetable - ${user?.institution || 'Institution'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 15px; color: #333; font-size: 11px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; }
            .institution-name { font-size: 20px; font-weight: bold; color: #1e40af; margin-bottom: 5px; }
            .timetable-info { font-size: 14px; color: #6b7280; }
            .master-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            .master-table th, .master-table td { border: 1px solid #d1d5db; padding: 4px; text-align: center; vertical-align: top; }
            .master-table th { background-color: #f3f4f6; font-weight: bold; color: #374151; font-size: 10px; }
            .day-header { background-color: #dbeafe; font-weight: bold; color: #1e40af; min-width: 80px; }
            .session-item { margin-bottom: 8px; padding: 3px; border-radius: 3px; font-size: 9px; }
            .session-subject { font-weight: bold; color: #7c3aed; }
            .session-faculty { color: #059669; }
            .session-section { color: #dc2626; }
            .session-room { color: #9333ea; }
            .empty-cell { color: #9ca3af; font-style: italic; }
            .stats { margin-top: 20px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
            .stat-box { background-color: #f9fafb; padding: 10px; border-radius: 5px; text-align: center; }
            .stat-value { font-size: 18px; font-weight: bold; color: #1e40af; }
            .stat-label { font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="institution-name">${user?.institution || 'Institution Name'}</div>
            <div class="timetable-info">Master Timetable - All Sections & Faculty | Generated on: ${new Date().toLocaleDateString()}</div>
          </div>
          
          <table class="master-table">
            <thead>
              <tr>
                <th>Day / Period</th>
                ${periods.map(period => `<th>Period ${period}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${days.map(day => `
                <tr>
                  <td class="day-header">${day}</td>
                  ${periods.map(period => {
                    const sessions = masterTimetable[day]?.[period] || [];
                    return `
                      <td style="min-width: 120px; max-width: 150px;">
                        ${sessions.length > 0 ? sessions.map(session => `
                          <div class="session-item" style="background-color: ${getSessionColor(session)};">
                            <div class="session-subject">${session.subject}</div>
                            <div class="session-faculty">${session.faculty}</div>
                            <div class="session-section">${session.section}</div>
                            <div class="session-room">📍 ${session.room}</div>
                          </div>
                        `).join('') : '<span class="empty-cell">No Classes</span>'}
                      </td>
                    `;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="stats">
            <div class="stat-box">
              <div class="stat-value">${masterData?.total_sessions || 0}</div>
              <div class="stat-label">Total Sessions</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${masterData?.sections?.length || 0}</div>
              <div class="stat-label">Sections</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${days.length}</div>
              <div class="stat-label">Working Days</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${periods.length}</div>
              <div class="stat-label">Periods/Day</div>
            </div>
          </div>
          
          <script>
            function getSessionColor(session) {
              const colors = ['#fef3c7', '#dbeafe', '#dcfce7', '#fce7f3', '#f3e8ff', '#fed7e2'];
              return colors[session.semester % colors.length] || '#f9fafb';
            }
          </script>
        </body>
      </html>
    `;
  };

  const getSessionBgColor = (session: any) => {
    const colors = [
      'bg-yellow-100 border-yellow-300',
      'bg-blue-100 border-blue-300',
      'bg-green-100 border-green-300',
      'bg-pink-100 border-pink-300',
      'bg-purple-100 border-purple-300',
      'bg-indigo-100 border-indigo-300'
    ];
    return colors[session.semester % colors.length] || 'bg-gray-100 border-gray-300';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-blue-100 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <Clock className="animate-spin mx-auto mb-4 text-indigo-600" size={48} />
          <div className="text-indigo-600 font-semibold text-lg">Loading master timetable...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-100 to-pink-100 flex items-center justify-center">
        <Card className="p-12 text-center bg-red-50 border-red-200 max-w-md">
          <div className="text-red-600 font-semibold text-lg mb-4">{error}</div>
          <Button onClick={() => navigate("/dashboard")} className="bg-red-500 hover:bg-red-600">
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const days = masterData?.days || [];
  const periods = masterData?.periods || [];
  const masterTimetable = masterData?.master_timetable || {};
  const sections = masterData?.sections || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-blue-100 to-purple-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-indigo-200 px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Calendar size={32} className="text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-indigo-800">Master Timetable</h1>
              <p className="text-gray-600 text-sm">
                Complete institutional view - All sections and faculty assignments
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="text-gray-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <Button
              onClick={handleDownload}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-80 bg-white/80 backdrop-blur-sm border-r border-indigo-200 min-h-screen p-6">
          {/* Statistics */}
          <Card className="p-4 bg-indigo-50 border-indigo-200 mb-6">
            <h3 className="font-semibold text-indigo-800 mb-3 flex items-center gap-2">
              <Building2 size={18} />
              Overview Statistics
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 text-sm">Total Sessions:</span>
                <span className="font-bold text-indigo-700">{masterData?.total_sessions || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 text-sm">Total Sections:</span>
                <span className="font-bold text-blue-700">{sections.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 text-sm">Working Days:</span>
                <span className="font-bold text-green-700">{days.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 text-sm">Periods/Day:</span>
                <span className="font-bold text-purple-700">{periods.length}</span>
              </div>
            </div>
          </Card>

          {/* Sections List */}
          <Card className="p-4 bg-blue-50 border-blue-200 mb-6">
            <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <Users size={18} />
              All Sections
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {sections.map((section: any) => (
                <div key={section.id} className="text-sm p-2 bg-white rounded border">
                  <div className="font-medium text-blue-700">{section.display_name}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Legend */}
          <Card className="p-4 bg-gray-50 border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <BookOpen size={18} />
              Legend
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-200 rounded"></div>
                <span>Subject Name</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-200 rounded"></div>
                <span>Faculty Name</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-200 rounded"></div>
                <span>Section</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-200 rounded"></div>
                <span>Room</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <Card className="shadow-xl rounded-xl bg-white/90 border-2 border-indigo-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-indigo-800">Institution-wide Schedule</h2>
                <div className="text-sm text-gray-600">
                  {masterData?.total_sessions || 0} total sessions across all sections
                </div>
              </div>
              
              <div className="overflow-auto">
                <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-indigo-100">
                      <th className="border px-3 py-2 text-indigo-700 font-semibold min-w-[100px] text-sm">
                        Day / Period
                      </th>
                      {periods.map((period) => (
                        <th key={period} className="border px-3 py-2 text-purple-700 font-semibold min-w-[200px] text-sm">
                          Period {period}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {days.map((day) => (
                      <tr key={day} className="hover:bg-indigo-50 transition">
                        <td className="border px-3 py-3 font-bold text-indigo-600 bg-indigo-50">
                          {day}
                        </td>
                        {periods.map((period) => {
                          const sessions = masterTimetable[day]?.[period] || [];
                          return (
                            <td key={period} className="border px-2 py-2 text-xs align-top">
                              {sessions.length > 0 ? (
                                <div className="space-y-1">
                                  {sessions.map((session: any, idx: number) => (
                                    <div key={idx} className={`p-2 rounded border ${getSessionBgColor(session)}`}>
                                      <div className="font-semibold text-purple-700 text-center text-xs">
                                        {session.subject}
                                      </div>
                                      <div className="text-green-700 text-center text-xs">
                                        {session.faculty}
                                      </div>
                                      <div className="text-red-700 text-center text-xs">
                                        {session.section}
                                      </div>
                                      <div className="text-blue-700 text-center text-xs">
                                        📍 {session.room}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-gray-400 text-center py-4 italic">
                                  No Classes
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
