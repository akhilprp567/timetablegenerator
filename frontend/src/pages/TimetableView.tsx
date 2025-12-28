import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, CalendarDays, Users, BookOpen, Home, Pencil, FileText, Building2, User, GraduationCap, Calendar } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";

export default function TimetableView() {
  const navigate = useNavigate();
  const { sectionId } = useParams();
  const [showJson, setShowJson] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timetableData, setTimetableData] = useState<any>(null);
  const [institutionData, setInstitutionData] = useState<any>(null);
  const [navigationData, setNavigationData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    async function fetchTimetable() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        
        // Fetch timetable data
        const res = await axios.get(
          `http://127.0.0.1:8000/timetable/view/${sectionId || 1}/`,
          {
            headers: {
              'Authorization': token ? `Token ${token}` : ''
            }
          }
        );
        setTimetableData(res.data);
        
        // Fetch navigation data
        const navRes = await axios.get(
          `http://127.0.0.1:8000/timetable/navigation/${sectionId || 1}/`,
          {
            headers: {
              'Authorization': token ? `Token ${token}` : ''
            }
          }
        );
        setNavigationData(navRes.data);
        
        // Set institution data
        setInstitutionData({
          name: user?.institution || "Sample Institution",
          course: "MCA",
          academicYear: "2024-25",
          section: res.data.section
        });
      } catch (err: any) {
        if (err.response?.status === 401) {
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          navigate("/login");
          return;
        }
        setError("Failed to load timetable.");
      }
      setLoading(false);
    }
    fetchTimetable();
  }, [sectionId, user, navigate]);

  const handleDownload = () => {
    // Generate PDF instead of JSON
    const printContent = generatePrintHTML();
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
  };

  const handlePrintPDF = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = generatePrintHTML();
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  const generatePrintHTML = () => {
    const days = timetableData?.days || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const periods = timetableData?.periods || ["1", "2", "3", "4", "5", "6"];
    const timetable = timetableData?.timetable || [];

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Timetable - ${institutionData?.section || 'Section'}</title>
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
            .lab-subject-name {
              font-weight: bold;
              color: #9333ea;
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
            .lab-indicator {
              color: #9333ea;
              font-size: 10px;
              font-weight: bold;
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
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="institution-name">${institutionData?.name || 'Institution Name'}</div>
            <div class="course-info">${institutionData?.course || 'Course'} - ${institutionData?.academicYear || 'Academic Year'}</div>
            <div class="section-info">Section: ${institutionData?.section || 'Section'} | Generated on: ${new Date().toLocaleDateString()}</div>
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
                          <div class="${session.is_lab ? 'lab-subject-name' : 'subject-name'}">
                            ${session.is_lab ? '🔬 ' : ''}${session.subject}
                          </div>
                          <div class="faculty-name">${session.faculty}</div>
                          <div class="room-name">${session.room}</div>
                          ${session.is_lab ? '<div class="lab-indicator">LAB SESSION</div>' : ''}
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

  const handleEdit = () => {
    navigate("/setup");
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  // Prepare days/periods from backend data
  const days = timetableData?.days || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const periods = timetableData?.periods || ["1", "2", "3", "4", "5", "6"];
  const timetable = timetableData?.timetable || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-blue-200 px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <CalendarDays size={32} className="text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-blue-800">Generated Timetable</h1>
              <p className="text-gray-600 text-sm">
                {institutionData?.name} | {institutionData?.course} - Section {institutionData?.section}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleBackToDashboard}
              className="text-gray-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <Button
              variant="default"
              onClick={handleDownload}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              JSON
            </Button>
            <Button
              variant="outline"
              onClick={handlePrintPDF}
              className="text-blue-700 border-blue-400"
            >
              <FileText className="w-4 h-4 mr-2" />
              Print PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/interactive-timetable/${sectionId}`)}
              className="text-green-700 border-green-400"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Interactive Edit
            </Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-72 bg-white/80 backdrop-blur-sm border-r border-blue-200 min-h-screen p-6">
          <div className="space-y-6">
            {/* Institution Info */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <Building2 size={18} />
                Institution Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <GraduationCap size={14} className="text-blue-600" />
                  <span className="text-gray-600">Course:</span>
                  <span className="font-medium">{institutionData?.course}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-blue-600" />
                  <span className="text-gray-600">Year:</span>
                  <span className="font-medium">{institutionData?.academicYear}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-blue-600" />
                  <span className="text-gray-600">Section:</span>
                  <span className="font-medium">{institutionData?.section}</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="space-y-4">
              <div className="bg-purple-50 rounded-lg p-4">
                <h4 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                  <BookOpen size={16} />
                  Quick Stats
                </h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Sessions:</span>
                    <span className="font-medium">{timetable.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Working Days:</span>
                    <span className="font-medium">{days.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Periods/Day:</span>
                    <span className="font-medium">{periods.length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                  <Home size={16} />
                  Navigation
                </h4>
                <div className="space-y-2">
                  {navigationData?.all_sections?.map((section: any) => (
                    <Button
                      key={section.id}
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/timetable/${section.id}`)}
                      className={`w-full text-left justify-start ${
                        section.id === parseInt(sectionId || '0') 
                          ? 'bg-green-100 border-green-400' 
                          : ''
                      }`}
                    >
                      {section.display_name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {/* Timetable Card */}
          <Card className="shadow-xl rounded-xl bg-white/90 border-2 border-blue-200">
            <div className="p-6">
              {loading ? (
                <div className="text-center py-10 text-blue-600 font-semibold">Loading timetable...</div>
              ) : error ? (
                <div className="text-center py-10 text-red-600 font-semibold">{error}</div>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-blue-100">
                        <th className="border px-4 py-3 text-blue-700 font-semibold min-w-[120px]">
                          Day / Period
                        </th>
                        {periods.map((period) => (
                          <th key={period} className="border px-4 py-3 text-purple-700 font-semibold min-w-[150px]">
                            Period {period}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {days.map((day) => (
                        <tr key={day} className="hover:bg-blue-50 transition">
                          <td className="border px-4 py-4 font-bold text-blue-600 bg-blue-50">
                            {day}
                          </td>
                          {periods.map((period) => {
                            const session = timetable.find(
                              (s: any) => s.day === day && String(s.period) === String(period)
                            );
                            return (
                              <td key={period} className="border px-4 py-4 text-sm">
                                {session ? (
                                  <div className="space-y-1">
                                    <div className={`font-semibold text-center ${session.is_lab ? 'text-purple-700' : 'text-blue-700'}`}>
                                      {session.is_lab && '🔬 '}{session.subject}
                                    </div>
                                    <div className="text-green-700 text-center">
                                      {session.faculty}
                                    </div>
                                    <div className={`text-xs text-center ${session.is_lab ? 'text-purple-600' : 'text-pink-600'}`}>
                                      📍 {session.room}
                                    </div>
                                    {session.is_lab && (
                                      <div className="text-xs text-center text-purple-500 font-medium">
                                        Lab Session
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-gray-400 text-center py-4">-</div>
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

          {/* JSON Data Preview */}
          <div className="mt-6 flex justify-end">
            <Button
              variant="outline"
              className="border-blue-400 text-blue-700"
              onClick={() => setShowJson((v) => !v)}
            >
              {showJson ? "Hide Raw JSON" : "Show Raw JSON"}
            </Button>
          </div>
          {showJson && timetableData && (
            <div className="mt-4 bg-gray-900 rounded-lg p-4 text-xs text-green-200 shadow-lg">
              <pre className="overflow-auto max-h-96">{JSON.stringify(timetableData, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
