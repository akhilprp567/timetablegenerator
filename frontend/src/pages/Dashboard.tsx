import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Settings, Eye, LogOut, User, Building2, Clock, Users, BookOpen, CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [setupStatus, setSetupStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/login");
      return;
    }
    setUser(JSON.parse(userData));
    checkSetupStatus();
  }, [navigate]);

  const checkSetupStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "http://127.0.0.1:8000/timetable/setup/status/",
        {
          headers: { 'Authorization': token ? `Token ${token}` : '' }
        }
      );
      setSetupStatus(response.data);
    } catch (error) {
      console.error("Error checking setup status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  if (!user || loading) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center">
      <div className="text-blue-600 font-semibold">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-blue-200 px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <CalendarDays size={32} className="text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-blue-800">Timetable Generator</h1>
              <p className="text-gray-600 text-sm">Smart scheduling made simple</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-700">
              <User size={20} />
              <span className="font-medium">{user.name}</span>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <LogOut size={16} className="mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-blue-800 mb-2">
            Welcome back, {user.name}!
          </h2>
          <p className="text-gray-600 text-lg">
            {setupStatus?.setup_complete ? 
              "Your institution setup is complete. You can generate new timetables or view existing ones." :
              "Complete your institution setup to start generating timetables."
            }
          </p>
        </div>

        {/* Setup Status Card */}
        <Card className="mb-8 p-6 border-2 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {setupStatus?.setup_complete ? (
                <CheckCircle size={32} className="text-green-600" />
              ) : (
                <AlertCircle size={32} className="text-orange-600" />
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {setupStatus?.setup_complete ? "Setup Complete" : "Setup Required"}
                </h3>
                <p className="text-gray-600">
                  {setupStatus?.setup_complete ? 
                    `Institution: ${setupStatus.institute?.name || 'Not specified'}` :
                    "Complete your institution setup to begin"
                  }
                </p>
              </div>
            </div>
            {setupStatus?.setup_complete && (
              <div className="text-right">
                <p className="text-sm text-gray-600">Faculty: {setupStatus.faculties?.length || 0}</p>
                <p className="text-sm text-gray-600">Rooms: {setupStatus.rooms?.length || 0}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <div className="flex items-center gap-3">
              <Building2 size={24} />
              <div>
                <p className="text-blue-100">Institution</p>
                <p className="font-semibold">{setupStatus?.institute?.name || "Not Set"}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <div className="flex items-center gap-3">
              <Users size={24} />
              <div>
                <p className="text-purple-100">Faculty Members</p>
                <p className="font-semibold">{setupStatus?.faculties?.length || 0}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-gradient-to-r from-pink-500 to-pink-600 text-white">
            <div className="flex items-center gap-3">
              <BookOpen size={24} />
              <div>
                <p className="text-pink-100">Available Rooms</p>
                <p className="font-semibold">{setupStatus?.rooms?.length || 0}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
          {/* Setup & Generate */}
          <Card className="p-10 shadow-xl bg-white/90 border-2 border-blue-200 hover:shadow-2xl transition-all duration-300 group">
            <div className="text-center">
              <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-200 transition-colors">
                <Settings size={40} className="text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-blue-800 mb-4">
                {setupStatus?.setup_complete ? "Generate New Timetable" : "Setup & Generate"}
              </h3>
              <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                {setupStatus?.setup_complete ? 
                  "Create timetables for new academic periods using your existing institution setup. Faculty hour limits will be automatically enforced." :
                  "Configure your institution settings, add faculty with their working hour limits, and set up rooms to get started."
                }
              </p>
              <Button
                onClick={() => navigate("/setup")}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 text-lg"
                size="lg"
              >
                <Settings size={22} className="mr-3" />
                {setupStatus?.setup_complete ? "Generate Timetable" : "Start Setup"}
              </Button>
            </div>
          </Card>

          {/* View Generated Timetables */}
          <Card className="p-10 shadow-xl bg-white/90 border-2 border-purple-200 hover:shadow-2xl transition-all duration-300 group">
            <div className="text-center">
              <div className="bg-purple-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-purple-200 transition-colors">
                <Eye size={40} className="text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-purple-800 mb-4">View Generated Timetables</h3>
              <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                Browse, view, and download your generated timetables. Each timetable respects faculty working hour limits and provides optimal distribution across the week.
              </p>
              <Button
                onClick={() => navigate("/timetables")}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-4 text-lg"
                size="lg"
                disabled={!setupStatus?.setup_complete}
              >
                <Eye size={22} className="mr-3" />
                View Timetables
              </Button>
              {!setupStatus?.setup_complete && (
                <p className="text-xs text-gray-500 mt-2">Complete setup first</p>
              )}
            </div>
          </Card>
        </div>

        {/* Faculty Details with Hour Limits */}
        {setupStatus?.setup_complete && setupStatus.faculties?.length > 0 && (
          <Card className="mt-12 p-6 bg-white/90 border-2 border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Faculty Overview & Hour Limits</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {setupStatus.faculties.slice(0, 6).map((faculty: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Users size={20} className="text-green-600" />
                    <div>
                      <p className="font-medium text-gray-800">{faculty.name}</p>
                      <p className="text-xs text-gray-500">{faculty.empId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-700">{faculty.maxHours}</p>
                    <p className="text-xs text-gray-500">hrs/week</p>
                  </div>
                </div>
              ))}
            </div>
            {setupStatus.faculties.length > 6 && (
              <p className="text-sm text-gray-500 mt-4">
                +{setupStatus.faculties.length - 6} more faculty members
              </p>
            )}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                💡 <strong>Smart Scheduling:</strong> The timetable generator will automatically respect each faculty member's weekly hour limit and distribute classes optimally across all available days.
              </p>
            </div>
          </Card>
        )}

        {/* Recent Activity */}
        <Card className="mt-12 p-6 bg-white/90 border-2 border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {setupStatus?.setup_complete ? (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle size={20} className="text-green-600" />
                <div>
                  <p className="font-medium text-gray-800">Setup Completed</p>
                  <p className="text-sm text-gray-600">Institution setup with {setupStatus.faculties?.length} faculty and {setupStatus.rooms?.length} rooms</p>
                </div>
                <span className="text-xs text-gray-500 ml-auto">Ready</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                <AlertCircle size={20} className="text-orange-600" />
                <div>
                  <p className="font-medium text-gray-800">Setup Required</p>
                  <p className="text-sm text-gray-600">Complete your institution setup to start generating timetables</p>
                </div>
                <Button size="sm" onClick={() => navigate("/setup")} className="ml-auto">
                  Setup Now
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
