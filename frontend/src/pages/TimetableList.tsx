import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Eye, Download, Calendar, Users, BookOpen, FileText, Building2, GraduationCap, Clock, User, AlertCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";

interface TimetableInfo {
  id: number;
  name: string;
  semester: number;
  course: string;
  sessions_count: number;
}

interface FacultyInfo {
  id: number;
  name: string;
  employee_id: string;
  max_hours_per_week: number;
  sessions_count: number;
  utilization: number;
}

export default function TimetableList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('type') || 'student');
  const [timetables, setTimetables] = useState<TimetableInfo[]>([]);
  const [faculties, setFaculties] = useState<FacultyInfo[]>([]);
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
    if (activeTab === 'student') {
      fetchTimetables();
    } else if (activeTab === 'faculty') {
      fetchFaculties();
    }
  }, [activeTab]);

  const fetchTimetables = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://127.0.0.1:8000/timetable/list/`,
        { headers: { 'Authorization': token ? `Token ${token}` : '' } }
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
    } finally {
      setLoading(false);
    }
  };

  const fetchFaculties = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://127.0.0.1:8000/timetable/faculty/list/`,
        { headers: { 'Authorization': token ? `Token ${token}` : '' } }
      );
      setFaculties(response.data.faculties || []);
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }
      setError("Failed to load faculty.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudent = (sectionId: number) => {
    navigate(`/timetable/${sectionId}`);
  };

  const handleViewFaculty = (facultyId: number) => {
    navigate(`/faculty-timetable/${facultyId}`);
  };

  const handleViewMaster = () => {
    navigate('/master-timetable');
  };

  const handleDownloadStudent = async (sectionId: number, sectionName: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://127.0.0.1:8000/timetable/view/${sectionId}/`,
        { headers: { 'Authorization': token ? `Token ${token}` : '' } }
      );
      
      const printContent = generateStudentPrintHTML(response.data, sectionName);
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
    } catch (err) {
      console.error("Error downloading timetable:", err);
      alert("Failed to download timetable");
    }
  };

  const handleDownloadFaculty = async (facultyId: number, facultyName: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://127.0.0.1:8000/timetable/faculty/${facultyId}/`,
        { headers: { 'Authorization': token ? `Token ${token}` : '' } }
      );
      
      const printContent = generateFacultyPrintHTML(response.data, facultyName);
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
    } catch (err) {
      console.error("Error downloading faculty timetable:", err);
      alert("Failed to download faculty timetable");
    }
  };

  const generateStudentPrintHTML = (timetableData: any, sectionName: string) => {
    const days = timetableData?.days || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const periods = timetableData?.periods || ["1", "2", "3", "4", "5", "6"];
    const timetable = timetableData?.timetable || [];

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student Timetable - Section ${sectionName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
            .institution-name { font-size: 24px; font-weight: bold; color: #1e40af; margin-bottom: 5px; }
            .course-info { font-size: 18px; color: #6b7280; margin-bottom: 10px; }
            .section-info { font-size: 16px; color: #374151; }
            .timetable-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            .timetable-table th, .timetable-table td { border: 1px solid #d1d5db; padding: 8px; text-align: center; vertical-align: middle; }
            .timetable-table th { background-color: #f3f4f6; font-weight: bold; color: #374151; }
            .day-header { background-color: #dbeafe; font-weight: bold; color: #1e40af; }
            .subject-name { font-weight: bold; color: #7c3aed; margin-bottom: 2px; }
            .faculty-name { color: #059669; margin-bottom: 2px; }
            .room-name { color: #dc2626; font-size: 10px; }
            .empty-cell { color: #9ca3af; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="institution-name">${user?.institution || 'Institution Name'}</div>
            <div class="course-info">Student Timetable - Section ${sectionName}</div>
            <div class="section-info">Generated on: ${new Date().toLocaleDateString()}</div>
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

  const generateFacultyPrintHTML = (facultyData: any, facultyName: string) => {
    const days = facultyData?.days || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const periods = facultyData?.periods || ["1", "2", "3", "4", "5", "6"];
    const timetable = facultyData?.timetable || [];
    const summary = facultyData?.summary || {};

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Faculty Timetable - ${facultyName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
            .institution-name { font-size: 24px; font-weight: bold; color: #1e40af; margin-bottom: 5px; }
            .faculty-info { font-size: 18px; color: #6b7280; margin-bottom: 10px; }
            .warning-section { background-color: #fef2f2; border: 2px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 8px; }
            .warning-title { color: #dc2626; font-weight: bold; margin-bottom: 10px; }
            .summary-box { background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .summary-item { display: inline-block; margin-right: 30px; }
            .summary-label { color: #6b7280; font-size: 14px; }
            .summary-value { font-weight: bold; color: #1e40af; font-size: 18px; }
            .timetable-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            .timetable-table th, .timetable-table td { border: 1px solid #d1d5db; padding: 8px; text-align: center; vertical-align: middle; }
            .timetable-table th { background-color: #f3f4f6; font-weight: bold; color: #374151; }
            .day-header { background-color: #dbeafe; font-weight: bold; color: #1e40af; }
            .subject-name { font-weight: bold; color: #7c3aed; margin-bottom: 2px; }
            .section-name { color: #059669; margin-bottom: 2px; }
            .room-name { color: #dc2626; font-size: 10px; }
            .consecutive-cell { background-color: #fef2f2; border: 2px solid #dc2626; }
            .consecutive-warning { color: #dc2626; font-size: 10px; font-weight: bold; }
            .empty-cell { color: #9ca3af; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="institution-name">${user?.institution || 'Institution Name'}</div>
            <div class="faculty-info">Faculty Schedule - ${facultyName}</div>
            <div style="font-size: 14px; color: #6b7280;">Employee ID: ${facultyData?.faculty?.employee_id || ''}</div>
          </div>
          
          ${Object.keys(summary.consecutive_warnings || {}).length > 0 ? `
          <div class="warning-section">
            <div class="warning-title">⚠️ WORKLOAD ALERT: Consecutive Period Violations Detected</div>
            <div style="font-size: 14px; color: #7f1d1d;">
              ${Object.entries(summary.consecutive_warnings || {}).map(([period, count]) => 
                `<div>• ${period.replace('_P', ' Periods ')}: ${count} consecutive classes</div>`
              ).join('')}
              <div style="margin-top: 8px; font-style: italic;">
                Recommendation: Consider redistributing classes to avoid faculty fatigue.
              </div>
            </div>
          </div>
          ` : ''}
          
          <div class="summary-box">
            <div class="summary-item">
              <div class="summary-label">Total Hours</div>
              <div class="summary-value">${summary.total_hours || 0}/${summary.max_hours || 0}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Utilization</div>
              <div class="summary-value">${(summary.utilization || 0).toFixed(1)}%</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Consecutive Violations</div>
              <div class="summary-value" style="color: ${(summary.total_consecutive_violations || 0) > 0 ? '#dc2626' : '#059669'}">${summary.total_consecutive_violations || 0}</div>
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
                      <td ${session?.is_consecutive ? 'class="consecutive-cell"' : ''}>
                        ${session ? `
                          <div class="subject-name">${session.subject}</div>
                          <div class="section-name">${session.section}</div>
                          <div class="room-name">${session.room}</div>
                          ${session.is_consecutive ? `<div class="consecutive-warning">⚠️ ${session.consecutive_info}</div>` : ''}
                        ` : '<span class="empty-cell">Free</span>'}
                      </td>
                    `;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="margin-top: 30px;">
            <h3 style="color: #1e40af;">Subject Summary</h3>
            ${Object.entries(summary.subject_summary || {}).map(([subject, count]) => 
              `<div>${subject}: ${count} hours/week</div>`
            ).join('')}
          </div>
        </body>
      </html>
    `;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-blue-200 px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Calendar size={32} className="text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-blue-800">Timetable Management</h1>
              <p className="text-gray-600 text-sm">
                View and download different types of timetables
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleViewMaster}
              className="text-indigo-700 border-indigo-300"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Master Timetable
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="text-gray-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Tabs for different timetable types */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="student" className="flex items-center gap-2">
              <GraduationCap size={18} />
              Student Timetables
            </TabsTrigger>
            <TabsTrigger value="faculty" className="flex items-center gap-2">
              <Users size={18} />
              Faculty Timetables
            </TabsTrigger>
          </TabsList>

          {/* Student Timetables Tab */}
          <TabsContent value="student" className="mt-8">
            {loading ? (
              <div className="text-center py-20">
                <Clock className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
                <div className="text-blue-600 font-semibold text-lg">Loading student timetables...</div>
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
                <GraduationCap size={48} className="mx-auto mb-4 text-yellow-600" />
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Student Timetables Found</h3>
                <p className="text-yellow-700 mb-6">Generate timetables first to view them here.</p>
                <Button 
                  onClick={() => navigate("/setup")}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                >
                  Generate Timetables
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {timetables.map((timetable) => (
                  <Card key={timetable.id} className="p-6 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/90 border-2 border-gray-200 hover:border-blue-300">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-blue-100 p-3 rounded-full">
                        <GraduationCap size={24} className="text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-blue-800">Section {timetable.name}</h3>
                        <p className="text-gray-600 text-sm">{timetable.course} - Semester {timetable.semester}</p>
                      </div>
                    </div>
                    <div className="space-y-2 mb-6 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sessions:</span>
                        <span className="font-medium">{timetable.sessions_count} classes</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleViewStudent(timetable.id)}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleDownloadStudent(timetable.id, timetable.name)}
                        className="text-green-700 border-green-400 hover:bg-green-50"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Faculty Timetables Tab */}
          <TabsContent value="faculty" className="mt-8">
            {loading ? (
              <div className="text-center py-20">
                <Clock className="animate-spin mx-auto mb-4 text-green-600" size={48} />
                <div className="text-green-600 font-semibold text-lg">Loading faculty timetables...</div>
              </div>
            ) : error ? (
              <Card className="p-12 text-center bg-red-50 border-red-200">
                <div className="text-red-600 font-semibold text-lg mb-4">{error}</div>
                <Button onClick={fetchFaculties} className="bg-red-500 hover:bg-red-600">
                  Try Again
                </Button>
              </Card>
            ) : faculties.length === 0 ? (
              <Card className="p-12 text-center bg-yellow-50 border-yellow-200">
                <Users size={48} className="mx-auto mb-4 text-yellow-600" />
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Faculty Timetables Found</h3>
                <p className="text-yellow-700 mb-6">Set up faculty and generate timetables first.</p>
                <Button 
                  onClick={() => navigate("/setup")}
                  className="bg-gradient-to-r from-green-500 to-blue-500 text-white"
                >
                  Setup Faculty
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {faculties.map((faculty) => (
                  <Card key={faculty.id} className="p-6 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/90 border-2 border-gray-200 hover:border-green-300">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-green-100 p-3 rounded-full">
                        <User size={24} className="text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-green-800">{faculty.name}</h3>
                        <p className="text-gray-600 text-sm">ID: {faculty.employee_id}</p>
                      </div>
                    </div>
                    <div className="space-y-2 mb-6 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Assigned Hours:</span>
                        <span className="font-medium">{faculty.sessions_count}/{faculty.max_hours_per_week}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Utilization:</span>
                        <span className={`font-medium ${faculty.utilization > 80 ? 'text-red-600' : faculty.utilization > 60 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {faculty.utilization.toFixed(1)}%
                        </span>
                      </div>
                      {/* Add workload indicator */}
                      {faculty.utilization > 90 && (
                        <div className="flex items-center gap-1 text-red-600 text-xs">
                          <AlertCircle size={12} />
                          <span>High workload - Check for consecutive periods</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleViewFaculty(faculty.id)}
                        className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 text-white"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Schedule
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleDownloadFaculty(faculty.id, faculty.name)}
                        className="text-green-700 border-green-400 hover:bg-green-50"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
