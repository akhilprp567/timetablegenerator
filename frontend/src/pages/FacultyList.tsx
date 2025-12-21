import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, Users, Clock, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";

interface Faculty {
  id: number;
  name: string;
  employee_id: string;
  max_hours: number;
  assigned_sessions: number;
}

export default function FacultyList() {
  const navigate = useNavigate();
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFaculties();
  }, []);

  const fetchFaculties = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://127.0.0.1:8000/timetable/faculty-list/`,
        {
          headers: { 'Authorization': token ? `Token ${token}` : '' }
        }
      );
      setFaculties(response.data.faculties || []);
    } catch (err: any) {
      if (err.response?.status === 401) {
        navigate("/login");
        return;
      }
      setError("Failed to load faculty list");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-blue-200 px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Users size={32} className="text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-blue-800">Faculty Members</h1>
              <p className="text-gray-600 text-sm">
                View timetables for individual faculty members
              </p>
            </div>
          </div>
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

      <div className="p-8">
        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
            <p className="text-blue-600 font-semibold">Loading faculty list...</p>
          </div>
        ) : error ? (
          <Card className="p-12 text-center bg-red-50 border-red-200">
            <div className="text-red-600 font-semibold mb-4">{error}</div>
            <Button onClick={fetchFaculties} className="bg-red-500 hover:bg-red-600">
              Try Again
            </Button>
          </Card>
        ) : faculties.length === 0 ? (
          <Card className="p-12 text-center bg-yellow-50 border-yellow-200">
            <Users size={48} className="mx-auto mb-4 text-yellow-600" />
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Faculty Found</h3>
            <p className="text-yellow-700">
              Please generate a timetable first to view faculty schedules.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {faculties.map((faculty) => (
              <Card key={faculty.id} className="p-6 shadow-lg hover:shadow-xl transition-all bg-white/90 border-2 border-gray-200 hover:border-blue-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <Users size={24} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-blue-800">{faculty.name}</h3>
                    <p className="text-gray-600 text-sm">ID: {faculty.employee_id}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-6 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Max Hours/Week:</span>
                    <span className="font-medium">{faculty.max_hours}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Assigned Sessions:</span>
                    <span className="font-medium text-green-600">{faculty.assigned_sessions}</span>
                  </div>
                </div>

                <Button
                  onClick={() => navigate(`/faculty/${faculty.id}`)}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Timetable
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
