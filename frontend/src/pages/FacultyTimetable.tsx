import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, AlertTriangle, CheckCircle2, User, Clock, BookOpen, AlertCircle, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";

export default function FacultyTimetable() {
  const navigate = useNavigate();
  const { facultyId } = useParams();
  const [loading, setLoading] = useState(true);
  const [facultyData, setFacultyData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFacultyTimetable();
  }, [facultyId]);

  const fetchFacultyTimetable = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://127.0.0.1:8000/timetable/faculty/${facultyId}/`,
        {
          headers: { 'Authorization': token ? `Token ${token}` : '' }
        }
      );
      setFacultyData(response.data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        navigate("/login");
        return;
      }
      setError("Failed to load faculty timetable");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!facultyData) return;

    const days = facultyData.days || [];
    const periods = facultyData.periods || [];
    const timetable = facultyData.timetable || [];

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Faculty Timetable - ${facultyData.faculty.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 20px;
            }
            .faculty-name {
              font-size: 24px;
              font-weight: bold;
              color: #1e40af;
            }
            .faculty-info {
              font-size: 14px;
              color: #6b7280;
              margin-top: 10px;
            }
            .timetable-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            .timetable-table th,
            .timetable-table td {
              border: 1px solid #d1d5db;
              padding: 8px;
              text-align: center;
            }
            .timetable-table th {
              background-color: #f3f4f6;
              font-weight: bold;
            }
            .day-header {
              background-color: #dbeafe;
              font-weight: bold;
              color: #1e40af;
            }
            .warnings {
              margin-top: 20px;
              padding: 15px;
              background-color: #fef3c7;
              border: 1px solid #fcd34d;
              border-radius: 4px;
            }
            .warning-item {
              margin: 8px 0;
              padding: 8px;
              background-color: #fff8dc;
              border-left: 4px solid #f59e0b;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="faculty-name">${facultyData.faculty.name}</div>
            <div class="faculty-info">
              Employee ID: ${facultyData.faculty.employee_id}<br>
              Max Hours/Week: ${facultyData.faculty.max_hours_per_week}<br>
              Assigned Sessions: ${facultyData.faculty.total_assigned_sessions}
            </div>
          </div>
          
          <table class="timetable-table">
            <thead>
              <tr>
                <th>Day / Period</th>
                ${periods.map((p: string) => `<th>Period ${p}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${days.map((day: string) => `
                <tr>
                  <td class="day-header">${day}</td>
                  ${periods.map((period: string) => {
                    const session = timetable.find((s: any) => s.day === day && String(s.period) === String(period));
                    return `
                      <td>
                        ${session ? `
                          <strong>${session.subject}</strong><br>
                          ${session.section} (Sem ${session.semester})<br>
                          <small>${session.room}</small>
                        ` : '-'}
                      </td>
                    `;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          ${facultyData.continuous_warnings && facultyData.continuous_warnings.length > 0 ? `
            <div class="warnings">
              <h3>⚠️ Continuous Class Warnings</h3>
              ${facultyData.continuous_warnings.map((w: any) => `
                <div class="warning-item">
                  <strong>${w.day}</strong>: Periods ${w.periods.join(', ')} (${w.count} consecutive)
                </div>
              `).join('')}
            </div>
          ` : ''}
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const days = facultyData?.days || [];
  const periods = facultyData?.periods || [];
  const timetable = facultyData?.timetable || [];
  const warnings = facultyData?.continuous_warnings || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-blue-200 px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <User size={32} className="text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-blue-800">Faculty Timetable</h1>
              <p className="text-gray-600 text-sm">
                {facultyData?.faculty?.name} ({facultyData?.faculty?.employee_id})
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate("/faculty-list")}
              className="text-gray-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Faculty List
            </Button>
            <Button
              onClick={handleDownloadPDF}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-72 bg-white/80 backdrop-blur-sm border-r border-blue-200 min-h-screen p-6">
          <div className="space-y-6">
            {/* Faculty Info */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <User size={18} />
                Faculty Details
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>
                  <p className="font-medium">{facultyData?.faculty?.name}</p>
                </div>
                <div>
                  <span className="text-gray-600">Employee ID:</span>
                  <p className="font-medium">{facultyData?.faculty?.employee_id}</p>
                </div>
                <div>
                  <span className="text-gray-600">Max Hours/Week:</span>
                  <p className="font-medium">{facultyData?.faculty?.max_hours_per_week}</p>
                </div>
                <div>
                  <span className="text-gray-600">Assigned Sessions:</span>
                  <p className="font-medium text-green-600">{facultyData?.faculty?.total_assigned_sessions}</p>
                </div>
              </div>
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-300">
                <h4 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                  <AlertTriangle size={18} />
                  Continuous Classes
                </h4>
                <div className="space-y-2">
                  {warnings.map((warning: any, idx: number) => (
                    <div key={idx} className="bg-yellow-100 p-2 rounded text-sm">
                      <div className="font-medium text-yellow-900">{warning.day}</div>
                      <div className="text-yellow-800">Periods {warning.periods.join(', ')}</div>
                      <div className={`text-xs font-semibold ${
                        warning.severity === 'high' ? 'text-red-600' : 'text-orange-600'
                      }`}>
                        {warning.count} consecutive classes
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <Card className="shadow-xl rounded-xl bg-white/90 border-2 border-blue-200">
            <div className="p-6">
              {loading ? (
                <div className="text-center py-10">
                  <Loader2 className="animate-spin mx-auto mb-4 text-blue-600" size={40} />
                  <p className="text-blue-600 font-semibold">Loading faculty timetable...</p>
                </div>
              ) : error ? (
                <div className="text-center py-10 text-red-600 font-semibold">{error}</div>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full border border-gray-300">
                    <thead>
                      <tr className="bg-blue-100">
                        <th className="border px-4 py-3 text-blue-700 font-semibold min-w-[120px]">
                          Day / Period
                        </th>
                        {periods.map((period: string) => (
                          <th key={period} className="border px-4 py-3 text-purple-700 font-semibold min-w-[150px]">
                            Period {period}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {days.map((day: string) => (
                        <tr key={day} className="hover:bg-blue-50">
                          <td className="border px-4 py-4 font-bold text-blue-600 bg-blue-50">
                            {day}
                          </td>
                          {periods.map((period: string) => {
                            const session = timetable.find(
                              (s: any) => s.day === day && String(s.period) === String(period)
                            );
                            return (
                              <td key={period} className="border px-4 py-4 text-sm">
                                {session ? (
                                  <div className="space-y-1">
                                    <div className="font-semibold text-purple-700">{session.subject}</div>
                                    <div className="text-gray-600">Section {session.section}</div>
                                    <div className="text-xs text-pink-600">📍 {session.room}</div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
