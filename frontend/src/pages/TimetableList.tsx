import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, Download, Calendar, Users, BookOpen, FileText, Building2, GraduationCap, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";

interface TimetableInfo {
  id: number;
  name: string;
  semester: number;
  course: string;
  sessions_count: number;
}

export default function TimetableList() {
  const navigate = useNavigate();
  const [timetables, setTimetables] = useState<TimetableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    fetchTimetables();
  }, []);

  const fetchTimetables = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      
      const response = await axios.get(
        `http://127.0.0.1:8000/timetable/list/`,
        {
          headers: {
            'Authorization': token ? `Token ${token}` : ''
          }
        }
      );
      
      setTimetables(response.data.timetables || []);
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }
      setError("Failed to load timetables.");
      console.error("Error fetching timetables:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (sectionId: number) => {
    navigate(`/timetable/${sectionId}`);
  };

  const handleDownload = async (sectionId: number, sectionName: string) => {
    try {
      const token = localStorage.getItem("token");
      
      const response = await axios.get(
        `http://127.0.0.1:8000/timetable/view/${sectionId}/`,
        {
          headers: {
            'Authorization': token ? `Token ${token}` : ''
          }
        }
      );
      
      // Generate PDF instead of JSON
      const printContent = generatePrintHTML(response.data, sectionName);
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert("Please allow popups for PDF download");
        return;
      }
      
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Auto print/save as PDF
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };
    } catch (err) {
      console.error("Error downloading timetable:", err);
      alert("Failed to download timetable");
    }
  };

  const generatePrintHTML = (timetableData: any, sectionName: string) => {
    const days = timetableData?.days || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const periods = timetableData?.periods || ["1", "2", "3", "4", "5", "6"];
    const timetable = timetableData?.timetable || [];

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Timetable - Section ${sectionName}</title>
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
            .institution-name {
              font-size: 24px;
              font-weight: bold;
              color: #1e40af;
              margin-bottom: 5px;
            }
            .course-info {
              font-size: 18px;
              color: #6b7280;
              margin-bottom: 10px;
            }
            .section-info {
              font-size: 16px;
              color: #374151;
            }
            .timetable-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              font-size: 12px;
            }
            .timetable-table th,
            .timetable-table td {
              border: 1px solid #d1d5db;
              padding: 8px;
              text-align: center;
              vertical-align: middle;
            }
            .timetable-table th {
              background-color: #f3f4f6;
              font-weight: bold;
              color: #374151;
            }
            .day-header {
              background-color: #dbeafe;
              font-weight: bold;
              color: #1e40af;
            }
            .subject-name {
              font-weight: bold;
              color: #7c3aed;
              margin-bottom: 2px;
            }
            .faculty-name {
              color: #059669;
              margin-bottom: 2px;
            }
            .room-name {
              color: #dc2626;
              font-size: 10px;
            }
            .empty-cell {
              color: #9ca3af;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #6b7280;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="institution-name">${user?.institution || 'Institution Name'}</div>
            <div class="course-info">Course Timetable - Academic Year 2024-25</div>
            <div class="section-info">Section: ${sectionName} | Generated on: ${new Date().toLocaleDateString()}</div>
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
                      <td>
                        ${session ? `
                          <div class="subject-name">${session.subject}</div>
                          <div class="faculty-name">${session.faculty}</div>
                          <div class="room-name">${session.room}</div>
                        ` : '<span class="empty-cell">-</span>'}
                      </td>
                    `;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Generated by Timetable Generator System</p>
          </div>
        </body>
      </html>
    `;
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-blue-200 px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Calendar size={32} className="text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-blue-800">Available Timetables</h1>
              <p className="text-gray-600 text-sm">
                View and download generated timetables for all sections
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleBackToDashboard}
            className="text-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      <div className="p-8">
        {/* Institution Info */}
        <Card className="mb-8 p-6 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-4">
            <Building2 size={24} className="text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-blue-800">
                {user?.institution || "Institution Name"}
              </h3>
              <p className="text-blue-600">Generated on: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </Card>

        {/* Timetables Grid */}
        {loading ? (
          <div className="text-center py-20">
            <Clock className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
            <div className="text-blue-600 font-semibold text-lg">Loading timetables...</div>
          </div>
        ) : error ? (
          <Card className="p-12 text-center bg-red-50 border-red-200">
            <div className="text-red-600 font-semibold text-lg mb-4">{error}</div>
            <Button onClick={fetchTimetables} className="bg-red-500 hover:bg-red-600">
              Try Again
            </Button>
          </Card>
        ) : timetables.length === 0 ? (
          <Card className="p-12 text-center bg-yellow-50 border-yellow-200">
            <Calendar size={48} className="mx-auto mb-4 text-yellow-600" />
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Timetables Found</h3>
            <p className="text-yellow-700 mb-6">
              It looks like you haven't generated any timetables yet. Start by setting up your institution and generating a new timetable.
            </p>
            <Button 
              onClick={() => navigate("/setup")}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white"
            >
              <Building2 className="w-4 h-4 mr-2" />
              Setup & Generate Timetable
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {timetables.map((timetable) => (
              <Card key={timetable.id} className="p-6 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/90 border-2 border-gray-200 hover:border-blue-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <Users size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-blue-800">
                      Section {timetable.name}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {timetable.course} - Semester {timetable.semester}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm">
                    <GraduationCap size={16} className="text-purple-600" />
                    <span className="text-gray-600">Course:</span>
                    <span className="font-medium">{timetable.course}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen size={16} className="text-green-600" />
                    <span className="text-gray-600">Semester:</span>
                    <span className="font-medium">{timetable.semester}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock size={16} className="text-orange-600" />
                    <span className="text-gray-600">Sessions:</span>
                    <span className="font-medium">{timetable.sessions_count} classes</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleView(timetable.id)}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDownload(timetable.id, timetable.name)}
                    className="text-green-700 border-green-400 hover:bg-green-50"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {timetables.length > 0 && (
          <Card className="mt-8 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-indigo-800">Summary</h4>
                <p className="text-indigo-600">
                  Total {timetables.length} timetable{timetables.length !== 1 ? 's' : ''} available
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-700">{timetables.length}</div>
                  <div className="text-sm text-purple-600">Sections</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-700">
                    {timetables.reduce((total, t) => total + t.sessions_count, 0)}
                  </div>
                  <div className="text-sm text-blue-600">Total Sessions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">
                    {new Set(timetables.map(t => t.semester)).size}
                  </div>
                  <div className="text-sm text-green-600">Semesters</div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
