import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import SetupWizard from "./pages/SetupWizard";
import TimetableView from "./pages/TimetableView";
import TimetableList from "./pages/TimetableList";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const user = localStorage.getItem("user");
    setIsAuthenticated(!!user);
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center">
        <div className="text-blue-600 font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} 
        />
        <Route 
          path="/register" 
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />} 
        />

        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/setup" 
          element={isAuthenticated ? <SetupWizard /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/timetables" 
          element={isAuthenticated ? <TimetableList /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/timetable" 
          element={isAuthenticated ? <TimetableView /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/timetable/:sectionId" 
          element={isAuthenticated ? <TimetableView /> : <Navigate to="/login" />} 
        />

        {/* Default Route */}
        <Route 
          path="/" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
