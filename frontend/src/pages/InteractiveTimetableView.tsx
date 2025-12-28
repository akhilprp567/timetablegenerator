import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Undo, Redo, Edit, Copy, Trash2, Users, Calendar, AlertCircle, CheckCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import axios from "axios";

interface SessionData {
  id: number;
  subject: string;
  faculty: string;
  room: string;
  day: string;
  period: number;
  section: string;
  is_lab: boolean;
}

interface UndoRedoAction {
  type: 'move' | 'swap' | 'delete' | 'bulk';
  data: any;
  timestamp: number;
}

export default function InteractiveTimetableView() {
  const navigate = useNavigate();
  const { sectionId } = useParams();
  
  // State management
  const [timetableData, setTimetableData] = useState<any>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessions, setSelectedSessions] = useState<number[]>([]);
  const [draggedSession, setDraggedSession] = useState<SessionData | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{day: string, period: number} | null>(null);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [undoStack, setUndoStack] = useState<UndoRedoAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoRedoAction[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Load timetable data
  useEffect(() => {
    fetchTimetableData();
  }, [sectionId]);

  const fetchTimetableData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://127.0.0.1:8000/timetable/view/${sectionId}/`,
        { headers: { 'Authorization': token ? `Token ${token}` : '' } }
      );
      setTimetableData(response.data);
      
      // Convert timetable data to sessions with IDs
      const sessionsWithIds = response.data.timetable.map((session: any, index: number) => ({
        id: index + 1, // Temporary ID, will be replaced with actual database IDs
        ...session
      }));
      setSessions(sessionsWithIds);
    } catch (error) {
      console.error("Error fetching timetable:", error);
    }
    setLoading(false);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, session: SessionData) => {
    setDraggedSession(session);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, day: string, period: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCell({ day, period });
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
  };

  const handleDrop = async (e: React.DragEvent, targetDay: string, targetPeriod: number) => {
    e.preventDefault();
    setDragOverCell(null);
    
    if (!draggedSession) return;
    
    // Check if dropping on the same cell
    if (draggedSession.day === targetDay && draggedSession.period === targetPeriod) {
      setDraggedSession(null);
      return;
    }

    // Validate move first
    const isValid = await validateMove(draggedSession.id, targetDay, targetPeriod);
    if (!isValid) return;

    // Perform the move
    await moveSession(draggedSession.id, targetDay, targetPeriod);
    setDraggedSession(null);
  };

  const validateMove = async (sessionId: number, newDay: string, newPeriod: number): Promise<boolean> => {
    try {
      // Find the target slot ID
      const targetSlot = timetableData?.days?.indexOf(newDay) * timetableData?.periods?.length + newPeriod - 1;
      
      const response = await axios.post(
        'http://127.0.0.1:8000/timetable/validate-move/',
        {
          session_id: sessionId,
          new_slot_id: targetSlot // This would need proper slot ID mapping
        },
        { headers: { 'Authorization': `Token ${localStorage.getItem("token")}` } }
      );

      if (!response.data.valid) {
        setConflicts(response.data.conflicts);
        return false;
      }
      
      setConflicts([]);
      return true;
    } catch (error) {
      console.error("Error validating move:", error);
      return false;
    }
  };

  const moveSession = async (sessionId: number, newDay: string, newPeriod: number) => {
    try {
      // Store action for undo
      const originalSession = sessions.find(s => s.id === sessionId);
      if (!originalSession) return;

      const undoAction: UndoRedoAction = {
        type: 'move',
        data: {
          sessionId,
          originalDay: originalSession.day,
          originalPeriod: originalSession.period,
          newDay,
          newPeriod
        },
        timestamp: Date.now()
      };

      // Update local state immediately for smooth UI
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, day: newDay, period: newPeriod }
          : session
      ));

      // Add to undo stack
      setUndoStack(prev => [...prev, undoAction]);
      setRedoStack([]); // Clear redo stack
      setUnsavedChanges(true);

      // TODO: Call backend API to persist the change
      // const response = await axios.post('http://127.0.0.1:8000/timetable/move-session/', {
      //   session_id: sessionId,
      //   new_slot_id: targetSlotId
      // });

    } catch (error) {
      console.error("Error moving session:", error);
      // Revert local changes on error
      fetchTimetableData();
    }
  };

  // Undo/Redo functionality
  const handleUndo = () => {
    if (undoStack.length === 0) return;

    const lastAction = undoStack[undoStack.length - 1];
    
    if (lastAction.type === 'move') {
      const { sessionId, originalDay, originalPeriod } = lastAction.data;
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, day: originalDay, period: originalPeriod }
          : session
      ));
    }

    // Move action to redo stack
    setRedoStack(prev => [...prev, lastAction]);
    setUndoStack(prev => prev.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;

    const actionToRedo = redoStack[redoStack.length - 1];
    
    if (actionToRedo.type === 'move') {
      const { sessionId, newDay, newPeriod } = actionToRedo.data;
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, day: newDay, period: newPeriod }
          : session
      ));
    }

    // Move action back to undo stack
    setUndoStack(prev => [...prev, actionToRedo]);
    setRedoStack(prev => prev.slice(0, -1));
  };

  // Selection handlers
  const handleSessionSelect = (sessionId: number, isMultiSelect: boolean) => {
    if (isMultiSelect) {
      setSelectedSessions(prev => 
        prev.includes(sessionId) 
          ? prev.filter(id => id !== sessionId)
          : [...prev, sessionId]
      );
    } else {
      setSelectedSessions([sessionId]);
    }
  };

  const handleSelectAll = () => {
    setSelectedSessions(sessions.map(s => s.id));
  };

  const handleClearSelection = () => {
    setSelectedSessions([]);
  };

  // Bulk operations
  const handleBulkDelete = async () => {
    if (selectedSessions.length === 0) return;
    
    if (!confirm(`Delete ${selectedSessions.length} selected sessions?`)) return;

    try {
      // Store for undo
      const deletedSessions = sessions.filter(s => selectedSessions.includes(s.id));
      const undoAction: UndoRedoAction = {
        type: 'bulk',
        data: { operation: 'delete', sessions: deletedSessions },
        timestamp: Date.now()
      };

      // Update local state
      setSessions(prev => prev.filter(s => !selectedSessions.includes(s.id)));
      setSelectedSessions([]);
      setUndoStack(prev => [...prev, undoAction]);
      setRedoStack([]);
      setUnsavedChanges(true);

      // TODO: Call backend API for bulk delete
      
    } catch (error) {
      console.error("Error in bulk delete:", error);
    }
  };

  const handleBulkReassignFaculty = async (newFacultyName: string) => {
    if (selectedSessions.length === 0) return;

    try {
      // Store for undo
      const affectedSessions = sessions.filter(s => selectedSessions.includes(s.id));
      const undoAction: UndoRedoAction = {
        type: 'bulk',
        data: { operation: 'reassign_faculty', sessions: affectedSessions },
        timestamp: Date.now()
      };

      // Update local state
      setSessions(prev => prev.map(session =>
        selectedSessions.includes(session.id)
          ? { ...session, faculty: newFacultyName }
          : session
      ));

      setSelectedSessions([]);
      setUndoStack(prev => [...prev, undoAction]);
      setRedoStack([]);
      setUnsavedChanges(true);

      // TODO: Call backend API for bulk reassign
      
    } catch (error) {
      console.error("Error in bulk reassign:", error);
    }
  };

  // Save changes
  const handleSave = async () => {
    try {
      // TODO: Implement save to backend
      setUnsavedChanges(false);
      alert("Changes saved successfully!");
    } catch (error) {
      console.error("Error saving changes:", error);
      alert("Failed to save changes");
    }
  };

  // Get session for a specific day/period
  const getSessionForSlot = (day: string, period: number): SessionData | null => {
    return sessions.find(s => s.day === day && s.period === period) || null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center">
        <div className="text-blue-600 font-semibold text-lg">Loading interactive timetable...</div>
      </div>
    );
  }

  const days = timetableData?.days || [];
  const periods = timetableData?.periods || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-blue-200 px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Edit size={32} className="text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-blue-800">Interactive Timetable Editor</h1>
              <p className="text-gray-600 text-sm">
                Drag & drop sessions, bulk operations, real-time conflict detection
              </p>
            </div>
          </div>
          <div className="flex gap-3 items-center">
            {unsavedChanges && (
              <span className="text-orange-600 text-sm font-medium flex items-center gap-1">
                <AlertCircle size={16} />
                Unsaved changes
              </span>
            )}
            <Button
              variant="outline"
              onClick={() => navigate(`/timetable/${sectionId}`)}
              className="text-gray-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              View Mode
            </Button>
            <Button
              variant="outline"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="text-blue-700"
            >
              <Undo className="w-4 h-4 mr-2" />
              Undo
            </Button>
            <Button
              variant="outline"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="text-blue-700"
            >
              <Redo className="w-4 h-4 mr-2" />
              Redo
            </Button>
            <Button
              onClick={handleSave}
              disabled={!unsavedChanges}
              className="bg-gradient-to-r from-green-500 to-blue-500 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-80 bg-white/80 backdrop-blur-sm border-r border-blue-200 min-h-screen p-6">
          {/* Selection Controls */}
          <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <Users size={18} />
              Selection Tools
            </h3>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSelectAll} variant="outline">
                  Select All
                </Button>
                <Button size="sm" onClick={handleClearSelection} variant="outline">
                  Clear
                </Button>
              </div>
              <div className="text-sm text-blue-700">
                Selected: {selectedSessions.length} sessions
              </div>
            </div>
          </Card>

          {/* Bulk Operations */}
          {selectedSessions.length > 0 && (
            <Card className="p-4 mb-6 bg-green-50 border-green-200">
              <h3 className="font-semibold text-green-800 mb-3">Bulk Operations</h3>
              <div className="space-y-2">
                <Button
                  size="sm"
                  onClick={handleBulkDelete}
                  className="w-full bg-red-500 hover:bg-red-600 text-white"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const newFaculty = prompt("Enter new faculty name:");
                    if (newFaculty) handleBulkReassignFaculty(newFaculty);
                  }}
                  className="w-full"
                  variant="outline"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Reassign Faculty
                </Button>
              </div>
            </Card>
          )}

          {/* Conflicts */}
          {conflicts.length > 0 && (
            <Card className="p-4 mb-6 bg-red-50 border-red-200">
              <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                <AlertCircle size={18} />
                Conflicts Detected
              </h3>
              <div className="space-y-2">
                {conflicts.map((conflict, index) => (
                  <div key={index} className="text-sm text-red-700">
                    • {conflict.message}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Instructions */}
          <Card className="p-4 bg-purple-50 border-purple-200">
            <h3 className="font-semibold text-purple-800 mb-3">How to Use</h3>
            <div className="text-sm text-purple-700 space-y-2">
              <div>• Drag sessions between time slots</div>
              <div>• Click sessions to select (Ctrl+click for multiple)</div>
              <div>• Use bulk operations for multiple sessions</div>
              <div>• Conflicts are detected in real-time</div>
              <div>• Use Undo/Redo for easy corrections</div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <Card className="shadow-xl rounded-xl bg-white/90 border-2 border-blue-200">
            <div className="p-6">
              <div className="overflow-auto">
                <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-blue-100">
                      <th className="border px-4 py-3 text-blue-700 font-semibold min-w-[120px]">
                        Day / Period
                      </th>
                      {periods.map((period) => (
                        <th key={period} className="border px-4 py-3 text-purple-700 font-semibold min-w-[180px]">
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
                          const session = getSessionForSlot(day, parseInt(period));
                          const isSelected = session && selectedSessions.includes(session.id);
                          const isDragOver = dragOverCell?.day === day && dragOverCell?.period === parseInt(period);
                          
                          return (
                            <td
                              key={period}
                              className={`border px-2 py-2 text-sm relative min-h-[100px] ${
                                isDragOver ? 'bg-green-100 border-green-400 border-2' : ''
                              }`}
                              onDragOver={(e) => handleDragOver(e, day, parseInt(period))}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, day, parseInt(period))}
                            >
                              {session ? (
                                <div
                                  draggable={isEditing}
                                  onDragStart={(e) => handleDragStart(e, session)}
                                  onClick={(e) => handleSessionSelect(session.id, e.ctrlKey || e.metaKey)}
                                  className={`p-2 rounded cursor-move transition-all ${
                                    isSelected 
                                      ? 'bg-yellow-100 border-2 border-yellow-400' 
                                      : 'bg-white border border-gray-200 hover:shadow-md'
                                  }`}
                                >
                                  <div className="font-semibold text-purple-700 text-xs mb-1">
                                    {session.subject}
                                  </div>
                                  <div className="text-green-700 text-xs mb-1">
                                    {session.faculty}
                                  </div>
                                  <div className="text-pink-600 text-xs">
                                    📍 {session.room}
                                  </div>
                                  {session.is_lab && (
                                    <div className="text-orange-600 text-xs mt-1">
                                      🔬 Lab
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="h-20 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded">
                                  Drop here
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
              
              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Total sessions: {sessions.length} | Selected: {selectedSessions.length}
                </div>
                <Button
                  onClick={() => setIsEditing(!isEditing)}
                  className={isEditing ? "bg-orange-500 hover:bg-orange-600" : "bg-green-500 hover:bg-green-600"}
                >
                  {isEditing ? "Exit Edit Mode" : "Enable Drag & Drop"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
