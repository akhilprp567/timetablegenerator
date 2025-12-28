import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, User, BookOpen, Clock, Building2, Calendar, Users, FileText, AlertCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";

export default function FacultyTimetableView() {
  const navigate = useNavigate();
  const { facultyId } = useParams();
  const [loading, setLoading] = useState(true);
  const [facultyData, setFacultyData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    fetchFacultyTimetable();
  }, [facultyId]);

  const fetchFacultyTimetable = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://127.0.0.1:8000/timetable/faculty/${facultyId || 1}/`,
        {
          headers: { 'Authorization': token ? `Token ${token}` : '' }
        }
      );
      setFacultyData(response.data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/login");
        return;
      } else if (err.response?.status === 404) {
        setError("Faculty not found");
      } else {
        setError("Failed to load faculty timetable");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!facultyData) return;
    
    const printContent = generateFacultyPrintHTML();
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

  const generateFacultyPrintHTML = () => {
    const days = facultyData?.days || [];
    const periods = facultyData?.periods || [];
    const timetable = facultyData?.timetable || [];
    const summary = facultyData?.summary || {};
    const faculty = facultyData?.faculty || {};

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Faculty Schedule - ${faculty.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
            .institution-name { font-size: 24px; font-weight: bold; color: #1e40af; margin-bottom: 5px; }
            .faculty-info { font-size: 18px; color: #6b7280; margin-bottom: 10px; }
            .warning-box { background-color: #fef2f2; border: 1px solid #fecaca; padding: 10px; margin: 15px 0; border-radius: 5px; }
            .warning-text { color: #dc2626; font-weight: bold; }
            .summary-section { background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
            .summary-item { text-align: center; }
            .summary-label { color: #6b7280; font-size: 14px; margin-bottom: 5px; }
            .summary-value { font-weight: bold; color: #1e40af; font-size: 20px; }
            .timetable-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            .timetable-table th, .timetable-table td { border: 1px solid #d1d5db; padding: 10px; text-align: center; vertical-align: middle; }
            .timetable-table th { background-color: #f3f4f6; font-weight: bold; color: #374151; }
            .day-header { background-color: #dcfce7; font-weight: bold; color: #15803d; min-width: 100px; }
            .subject-name { font-weight: bold; color: #7c3aed; margin-bottom: 3px; }
            .section-name { color: #059669; margin-bottom: 3px; font-size: 11px; }
            .room-name { color: #dc2626; font-size: 10px; }
            .consecutive-warning { background-color: #fef2f2; border: 2px solid #dc2626; }
            .consecutive-flag { color: #dc2626; font-size: 10px; font-weight: bold; }
            .empty-cell { color: #9ca3af; font-style: italic; }
            .subject-summary { margin-top: 30px; }
            .subject-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 10px; }
            .subject-item { background-color: #f9fafb; padding: 10px; border-radius: 5px; border-left: 4px solid #3b82f6; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="institution-name">${user?.institution || 'Institution Name'}</div>
            <div class="faculty-info">Faculty Schedule - ${faculty.name || 'Faculty Name'}</div>
            <div style="font-size: 14px; color: #6b7280;">
              Employee ID: ${faculty.employee_id || ''} | Generated on: ${new Date().toLocaleDateString()}
            </div>
          </div>
          
          ${Object.keys(summary.consecutive_warnings || {}).length > 0 ? `
          <div class="warning-box">
            <div class="warning-text">⚠️ Workload Alert: ${summary.total_consecutive_violations} consecutive period violation(s) detected</div>
            <div style="margin-top: 5px; font-size: 12px; color: #7f1d1d;">
              ${Object.entries(summary.consecutive_warnings || {}).map(([period, count]) => 
                `• ${period.replace('_P', ' Periods ')}: ${count} consecutive classes`
              ).join('<br>')}
            </div>
          </div>
          ` : ''}
          
          <div class="summary-section">
            <h3 style="color: #1e40af; margin-bottom: 15px; text-align: center;">Weekly Summary</h3>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-label">Assigned Hours</div>
                <div class="summary-value">${summary.total_hours || 0}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Maximum Hours</div>
                <div class="summary-value">${summary.max_hours || 0}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Utilization</div>
                <div class="summary-value" style="color: ${(summary.utilization || 0) > 80 ? '#dc2626' : '#059669'}">${(summary.utilization || 0).toFixed(1)}%</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Free Hours</div>
                <div class="summary-value">${(summary.max_hours || 0) - (summary.total_hours || 0)}</div>
              </div>
            </div>
          </div>
          
          <table class="timetable-table">
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
                    const session = timetable.find((s: any) => s.day === day && String(s.period) === String(period));
                    return `
                      <td style="min-width: 150px;" ${session?.is_consecutive ? 'class="consecutive-warning"' : ''}>
                        ${session ? `
                          <div class="subject-name">${session.subject}</div>
                          <div class="section-name">${session.section}</div>
                          <div class="room-name">📍 ${session.room}</div>
                          ${session.is_consecutive ? `<div class="consecutive-flag">⚠️ ${session.consecutive_info}</div>` : ''}
                        ` : '<span class="empty-cell">Free Period</span>'}
                      </td>
                    `;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="subject-summary">
            <h3 style="color: #1e40af; margin-bottom: 15px;">Subject Allocation</h3>
            <div class="subject-list">
              ${Object.entries(summary.subject_summary || {}).map(([subject, count]) => 
                `<div class="subject-item">
                  <strong>${subject}</strong><br>
                  <span style="color: #6b7280;">${count} hours per week</span>
                </div>`
              ).join('')}
            </div>
          </div>
          
          ${summary.day_wise_count ? `
          <div style="margin-top: 30px;">
            <h3 style="color: #1e40af; margin-bottom: 15px;">Daily Workload Distribution</h3>
            <div class="subject-list">
              ${Object.entries(summary.day_wise_count).map(([day, count]) => 
                `<div class="subject-item">
                  <strong>${day}</strong><br>
                  <span style="color: #6b7280;">${count} classes</span>
                </div>`
              ).join('')}
            </div>
          </div>
          ` : ''}
          
          <div class="footer">
            <p>This is an official faculty schedule generated by the Timetable Generator System</p>
            <p>For any queries or changes, please contact the Academic Office</p>
          </div>
        </body>
      </html>
    `;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-100 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <Clock className="animate-spin mx-auto mb-4 text-green-600" size={48} />
          <div className="text-green-600 font-semibold text-lg">Loading faculty schedule...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-100 to-pink-100 flex items-center justify-center">
        <Card className="p-12 text-center bg-red-50 border-red-200 max-w-md">
          <div className="text-red-600 font-semibold text-lg mb-4">{error}</div>
          <Button onClick={() => navigate("/timetables?type=faculty")} className="bg-red-500 hover:bg-red-600">
            Back to Faculty List
          </Button>
        </Card>
      </div>
    );
  }

  const days = facultyData?.days || [];
  const periods = facultyData?.periods || [];
  const timetable = facultyData?.timetable || [];
  const summary = facultyData?.summary || {};
  const faculty = facultyData?.faculty || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-100 to-purple-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-green-200 px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <User size={32} className="text-green-600" />
            <div>
              <h1 className="text-2xl font-bold text-green-800">Faculty Schedule</h1>
              <p className="text-gray-600 text-sm">
                {faculty.name} (ID: {faculty.employee_id})
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate("/timetables?type=faculty")}
              className="text-gray-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Faculty List
            </Button>
            <Button
              onClick={handleDownload}
              className="bg-gradient-to-r from-green-500 to-blue-500 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-80 bg-white/80 backdrop-blur-sm border-r border-green-200 min-h-screen p-6">
          {/* Faculty Info */}
          <Card className="p-4 bg-green-50 border-green-200 mb-6">
            <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
              <User size={18} />
              Faculty Details
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Name:</span>
                <p className="font-medium text-green-700">{faculty.name}</p>
              </div>
              <div>
                <span className="text-gray-600">Employee ID:</span>
                <p className="font-medium text-green-700">{faculty.employee_id}</p>
              </div>
              <div>
                <span className="text-gray-600">Max Hours/Week:</span>
                <p className="font-medium text-green-700">{faculty.max_hours_per_week}</p>
              </div>
            </div>
          </Card>

          {/* Consecutive Period Warning */}
          {summary.consecutive_warnings && Object.keys(summary.consecutive_warnings).length > 0 && (
            <Card className="p-4 bg-red-50 border-red-200 mb-6">
              <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                <AlertCircle size={18} />
                Workload Alert
              </h3>
              <div className="space-y-2 text-sm">
                <p className="text-red-700 font-medium">
                  {summary.total_consecutive_violations} consecutive period violation(s) detected
                </p>
                {Object.entries(summary.consecutive_warnings).map(([period, count]: [string, any]) => (
                  <div key={period} className="text-red-600 text-xs">
                    • {period.replace('_P', ' Periods ')}: {count} consecutive classes
                  </div>
                ))}
                <p className="text-red-600 text-xs mt-2">
                  ⚠️ Faculty may experience fatigue with 3+ consecutive periods
                </p>
              </div>
            </Card>
          )}

          {/* Weekly Summary */}
          <Card className="p-4 bg-blue-50 border-blue-200 mb-6">
            <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <Clock size={18} />
              Weekly Summary
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Assigned Hours:</span>
                <span className="font-bold text-blue-700 text-lg">{summary.total_hours || 0}/{summary.max_hours || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Utilization:</span>
                <span className={`font-bold text-lg ${
                  (summary.utilization || 0) > 80 ? 'text-red-600' : 
                  (summary.utilization || 0) > 60 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {(summary.utilization || 0).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Free Hours:</span>
                <span className="font-bold text-green-700 text-lg">{(summary.max_hours || 0) - (summary.total_hours || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Consecutive Violations:</span>
                <span className={`font-bold text-lg ${summary.total_consecutive_violations > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {summary.total_consecutive_violations || 0}
                </span>
              </div>
            </div>
          </Card>

          {/* Subject Summary */}
          <Card className="p-4 bg-purple-50 border-purple-200">
            <h3 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
              <BookOpen size={18} />
              Subject Allocation
            </h3>
            <div className="space-y-2 text-sm max-h-60 overflow-y-auto">
              {Object.entries(summary.subject_summary || {}).map(([subject, count]) => (
                <div key={subject} className="flex justify-between">
                  <span className="text-gray-600 truncate">{subject}</span>
                  <span className="font-medium text-purple-700">{count}h</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <Card className="shadow-xl rounded-xl bg-white/90 border-2 border-green-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-green-800">Weekly Schedule</h2>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-600">
                    Total Classes: {timetable.length}
                  </div>
                  {summary.total_consecutive_violations > 0 && (
                    <div className="flex items-center gap-1 bg-red-100 px-3 py-1 rounded-full text-red-700 text-sm">
                      <AlertCircle size={14} />
                      {summary.total_consecutive_violations} Alert(s)
                    </div>
                  )}
                </div>
              </div>
              
              <div className="overflow-auto">
                <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-green-100">
                      <th className="border px-4 py-3 text-green-700 font-semibold min-w-[120px]">
                        Day / Period
                      </th>
                      {periods.map((period) => (
                        <th key={period} className="border px-4 py-3 text-blue-700 font-semibold min-w-[180px]">
                          Period {period}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {days.map((day) => (
                      <tr key={day} className="hover:bg-green-50 transition">
                        <td className="border px-4 py-4 font-bold text-green-600 bg-green-50">
                          {day}
                        </td>
                        {periods.map((period) => {
                          const session = timetable.find(
                            (s: any) => s.day === day && String(s.period) === String(period)
                          );
                          return (
                            <td key={period} className={`border px-4 py-4 text-sm ${
                              session?.is_consecutive ? 'bg-red-50 border-red-300 border-2' : ''
                            }`}>
                              {session ? (
                                <div className="space-y-1">
                                  <div className="font-semibold text-purple-700 text-center">
                                    {session.subject}
                                  </div>
                                  <div className="text-green-700 text-center text-xs">
                                    {session.section}
                                  </div>
                                  <div className="text-xs text-pink-600 text-center">
                                    📍 {session.room}
                                  </div>
                                  {session.is_consecutive && (
                                    <div className="text-xs text-red-600 text-center font-bold bg-red-100 px-2 py-1 rounded">
                                      ⚠️ {session.consecutive_info}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-gray-400 text-center py-4 italic">Free Period</div>
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
