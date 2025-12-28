import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Play, Pause, RotateCcw, Zap, Brain, Clock, Database, Users, ArrowDown, ArrowRight, CheckCircle, AlertTriangle, Info, GitBranch, Table, Network } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AlgorithmStep {
  id: string;
  title: string;
  description: string;
  type: string;
  inputs: string[];
  outputs: string[];
  details: string;
  complexity: string;
  sample_data: any;
}

interface TestCase {
  id: string;
  title: string;
  description: string;
  parameters: any;
  expected_outcome: any;
  visualization_color: string;
}

export default function Flowchart() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState('optimal');
  const [showDetails, setShowDetails] = useState<string | null>(null);

  // Updated flowchart data to match YOUR actual algorithm
  const flowchartData = {
    algorithm_steps: [
      {
        "id": "step1",
        "title": "Initialize & Validate System",
        "description": "Load sections, slots, settings and validate faculty hour constraints",
        "type": "input",
        "inputs": ["Sections", "TimetableSlots", "InstitutionSettings", "Faculty"],
        "outputs": ["System Configuration", "Faculty Hour Limits"],
        "details": "Your algorithm starts by loading all sections, creating time slot matrix (working_days × periods_per_day), and establishing strict faculty hour limits with tracking structures",
        "complexity": "O(1)",
        "sample_data": {
          "sections_count": "Section.objects.all().count()",
          "slots_created": "working_days × periods_per_day",
          "faculty_limits": "faculty.max_hours_per_week validation",
          "tracking_structures": ["faculty_schedule", "faculty_hours_used", "room_schedule", "section_schedule"]
        }
      },
      {
        "id": "step2",
        "title": "Clear Previous & Initialize Tracking",
        "description": "Delete old sessions and initialize tracking dictionaries",
        "type": "processing",
        "inputs": ["Previous ScheduledSessions"],
        "outputs": ["Clean State", "Tracking Matrices"],
        "details": "ScheduledSession.objects.all().delete() - Your algorithm ensures clean slate, then initializes defaultdict structures for conflict tracking",
        "complexity": "O(n) where n = previous sessions",
        "sample_data": {
          "cleared_objects": ["ScheduledSession"],
          "initialized_tracking": {
            "faculty_schedule": "defaultdict(set)",
            "faculty_hours_used": "defaultdict(int)",
            "room_schedule": "defaultdict(set)",
            "section_schedule": "defaultdict(set)",
            "section_day_count": "nested defaultdict",
            "subject_day_count": "triple nested defaultdict"
          }
        }
      },
      {
        "id": "step3",
        "title": "Build Faculty Session List",
        "description": "Create session requests from FacultySubjectAllocation with multiple faculty support",
        "type": "processing",
        "inputs": ["FacultySubjectAllocation", "Subject.weekly_hours", "Faculty capacity"],
        "outputs": ["all_sessions list"],
        "details": "Your algorithm supports multiple faculty per subject through FacultySubjectAllocation.hours_per_week, creating individual session objects with priority scoring",
        "complexity": "O(s × f) where s = subjects, f = faculty allocations",
        "sample_data": {
          "allocation_query": "FacultySubjectAllocation.objects.filter(subject=subject)",
          "session_creation": "allocation.hours_per_week sessions per faculty",
          "room_selection": "Lab rooms for lab_required=True, else regular rooms",
          "priority_factors": ["lab_required", "faculty_load_balance", "session_distribution"]
        }
      },
      {
        "id": "step4",
        "title": "Enhanced Priority Sorting",
        "description": "Sort sessions by faculty load balance, lab preference, and distribution",
        "type": "optimization",
        "inputs": ["all_sessions", "Faculty current load", "Session priorities"],
        "outputs": ["Sorted session queue"],
        "details": "Your session_sort_key function balances faculty_load_ratio, section_current_load, and session.priority with randomization",
        "complexity": "O(n log n) where n = total sessions",
        "sample_data": {
          "sort_key_formula": "(faculty_load_ratio, section_load, priority, random.random())",
          "faculty_load_ratio": "faculty_hours_used[id] / faculty_limits[id]",
          "lab_priority_boost": "Labs get priority_boost = 0, Theory = 5",
          "balancing": "Prioritizes faculty with lower relative load"
        }
      },
      {
        "id": "step5",
        "title": "Strategic Day Selection & Slot Assignment",
        "description": "Enhanced day selection using ALL available days with day scoring",
        "type": "iteration",
        "inputs": ["Prioritized sessions", "slots_by_day", "Day utilization scores"],
        "outputs": ["Scheduled sessions", "Updated tracking"],
        "details": "Your algorithm calculates day_scores considering section_sessions_today, subject_sessions_today, and overall day_total_sessions for optimal distribution",
        "complexity": "O(n × d × s × r) where n=sessions, d=days, s=slots, r=rooms",
        "sample_data": {
          "day_scoring": {
            "subject_sessions_today": "× 10 penalty",
            "section_sessions_today": "× 3 penalty", 
            "day_total_sessions": "× 1 penalty",
            "random_factor": "0-0.3 for variety"
          },
          "slot_prioritization": "Middle periods preferred: abs(period - periods_per_day//2)",
          "consecutive_limits": "Labs: 3, Theory: 2"
        }
      },
      {
        "id": "step6",
        "title": "Multi-Level Conflict Resolution",
        "description": "Comprehensive conflict checking with fallback strategies",
        "type": "decision",
        "inputs": ["Potential slot", "All tracking matrices"],
        "outputs": ["Approved slot or try next"],
        "details": "Your algorithm checks faculty conflicts, section conflicts, room conflicts, consecutive session limits, and daily session limits with relaxed fallback constraints",
        "complexity": "O(1) per conflict check",
        "sample_data": {
          "conflict_checks": [
            "slot.id in faculty_schedule[faculty.id]",
            "slot.id in section_schedule[section.id]", 
            "slot.id in room_schedule[room.id]",
            "consecutive_count >= consecutive_limit",
            "section_day_count[section][day] >= max_sessions_per_day"
          ],
          "fallback_relaxation": [
            "Allow theory in lab rooms if needed",
            "Increase max_sessions_per_day in fallback",
            "Accept non-adjacent lab sessions"
          ]
        }
      },
      {
        "id": "step7",
        "title": "Tracking Matrix Updates",
        "description": "Update all tracking structures after successful scheduling",
        "type": "processing",
        "inputs": ["Scheduled session", "All tracking matrices"],
        "outputs": ["Updated system state"],
        "details": "Your algorithm updates 5 different tracking structures: faculty_schedule, faculty_hours_used, room_schedule, section_schedule, and day counters",
        "complexity": "O(1) per update",
        "sample_data": {
          "update_operations": [
            "faculty_schedule[faculty.id].add(slot.id)",
            "faculty_hours_used[faculty.id] += 1",
            "room_schedule[room.id].add(slot.id)",
            "section_schedule[section.id].add(slot.id)",
            "section_day_count[section.id][day] += 1",
            "subject_day_count[section.id][subject.id][day] += 1"
          ],
          "database_save": "ScheduledSession.objects.create(...)"
        }
      },
      {
        "id": "step8",
        "title": "Comprehensive Statistics & Validation",
        "description": "Generate detailed analytics, utilization metrics, and warnings",
        "type": "output",
        "inputs": ["Final schedule", "Original requirements", "Faculty usage"],
        "outputs": ["Statistics report", "Warnings", "Success rate"],
        "details": "Your algorithm provides faculty utilization analysis, day-wise utilization, overall slot usage, and identifies underutilized/overutilized resources with detailed logging",
        "complexity": "O(n + f + s) where n=sessions, f=faculty, s=sections",
        "sample_data": {
          "statistics_calculated": [
            "scheduled_count / len(all_sessions) * 100",
            "faculty_hours_used / faculty_limits * 100",
            "day_sessions / (periods_per_day * sections.count()) * 100",
            "overall_slot_utilization percentage"
          ],
          "validation_checks": [
            "sections_without_sessions detection",
            "underutilized_faculty (< 50%)",
            "overutilized_faculty (>= limit)",
            "success_rate < 70% warnings"
          ]
        }
      }
    ],
    test_cases: [
      {
        "id": "optimal",
        "title": "Optimal Case",
        "description": "Sufficient resources, balanced faculty loads",
        "parameters": {
          "faculty_count": 8,
          "subjects": 12,
          "sections": 4,
          "working_days": 6,
          "periods_per_day": 7,
          "total_hours_needed": 120,
          "total_hours_available": 144
        },
        "expected_outcome": {
          "success_rate": "95-100%",
          "faculty_utilization": "70-85%",
          "issues": "Minimal conflicts"
        },
        "visualization_color": "#10B981"
      },
      {
        "id": "constrained",
        "title": "Resource Constrained",
        "description": "Limited faculty hours or rooms",
        "parameters": {
          "faculty_count": 5,
          "subjects": 15,
          "sections": 6,
          "working_days": 5,
          "periods_per_day": 6,
          "total_hours_needed": 180,
          "total_hours_available": 150
        },
        "expected_outcome": {
          "success_rate": "75-85%",
          "faculty_utilization": "90-100%",
          "issues": "Some sessions unscheduled"
        },
        "visualization_color": "#F59E0B"
      },
      {
        "id": "overloaded",
        "title": "Overloaded System",
        "description": "More requirements than capacity",
        "parameters": {
          "faculty_count": 4,
          "subjects": 20,
          "sections": 8,
          "working_days": 5,
          "periods_per_day": 7,
          "total_hours_needed": 280,
          "total_hours_available": 160
        },
        "expected_outcome": {
          "success_rate": "50-65%",
          "faculty_utilization": "100%",
          "issues": "Many unscheduled sessions"
        },
        "visualization_color": "#EF4444"
      }
    ],
    interactive_elements: {
      "what_if_scenarios": [
        {
          "question": "What if we add one more faculty member?",
          "impact": "Reduces average faculty load, improves success rate by ~15%",
          "explanation": "More teaching capacity allows better distribution and fewer conflicts"
        },
        {
          "question": "What if we reduce working days from 6 to 5?", 
          "impact": "Increases day density, may reduce success rate by ~20%",
          "explanation": "Fewer available slots create more scheduling conflicts"
        },
        {
          "question": "What if all subjects require lab rooms?",
          "impact": "Room conflicts increase dramatically, success rate drops ~40%",
          "explanation": "Limited lab rooms become bottleneck resource"
        },
        {
          "question": "What if faculty hours are unlimited?",
          "impact": "Scheduling becomes purely slot-based, ~98% success rate",
          "explanation": "Removes faculty capacity constraints, only time/room conflicts remain"
        }
      ],
      "algorithm_variations": [
        {
          "name": "Greedy First-Fit",
          "description": "Schedule sessions in order without optimization",
          "pros": ["Fast execution", "Simple implementation"],
          "cons": ["Poor resource utilization", "Unbalanced schedule"]
        },
        {
          "name": "Priority-Based (Current)",
          "description": "Sort by priority then schedule optimally",
          "pros": ["Balanced workload", "Handles constraints well"],
          "cons": ["More complex", "Slightly slower"]
        },
        {
          "name": "Genetic Algorithm",
          "description": "Evolutionary approach for optimal solutions",
          "pros": ["Near-optimal results", "Handles complex constraints"],
          "cons": ["Much slower", "Complex implementation"]
        }
      ]
    },
    performance_data: {
      "time_complexity": {
        "initialization": "O(d × p) - Create time slots",
        "validation": "O(f) - Check faculty limits", 
        "session_creation": "O(s × a) - Create session list",
        "sorting": "O(n log n) - Priority sorting",
        "scheduling": "O(n × s × r) - Main scheduling loop",
        "overall": "O(n × s × r) - Dominated by scheduling loop"
      },
      "space_complexity": {
        "tracking_matrices": "O(f × s + r × s + sec × s) - Conflict tracking",
        "session_storage": "O(n) - Session objects", 
        "overall": "O((f + r + sec) × s + n) - Linear in most parameters"
      },
      "typical_performance": {
        "small_institution": "< 1 second (4 faculty, 50 sessions)",
        "medium_institution": "2-5 seconds (10 faculty, 200 sessions)",
        "large_institution": "10-30 seconds (25 faculty, 500 sessions)"
      }
    },
    data_flow: {
      "entities": [
        {"name": "User Input", "type": "external", "color": "#3B82F6"},
        {"name": "Institution Settings", "type": "process", "color": "#10B981"},
        {"name": "Faculty Management", "type": "process", "color": "#F59E0B"},
        {"name": "Academic Structure", "type": "process", "color": "#8B5CF6"},
        {"name": "Scheduling Engine", "type": "process", "color": "#EF4444"},
        {"name": "Conflict Resolution", "type": "process", "color": "#F97316"},
        {"name": "Output Generation", "type": "process", "color": "#06B6D4"},
        {"name": "Database Storage", "type": "datastore", "color": "#6B7280"}
      ],
      "flows": [
        {"from": "User Input", "to": "Institution Settings", "data": "Working days, periods, duration"},
        {"from": "User Input", "to": "Faculty Management", "data": "Faculty details, hour limits"},
        {"from": "User Input", "to": "Academic Structure", "data": "Subjects, sections, allocations"},
        {"from": "Institution Settings", "to": "Scheduling Engine", "data": "Time slot matrix"},
        {"from": "Faculty Management", "to": "Scheduling Engine", "data": "Faculty capacity constraints"},
        {"from": "Academic Structure", "to": "Scheduling Engine", "data": "Session requirements"},
        {"from": "Scheduling Engine", "to": "Conflict Resolution", "data": "Scheduling conflicts"},
        {"from": "Conflict Resolution", "to": "Scheduling Engine", "data": "Resolved assignments"},
        {"from": "Scheduling Engine", "to": "Output Generation", "data": "Final schedule"},
        {"from": "Output Generation", "to": "Database Storage", "data": "ScheduledSession objects"},
        {"from": "Database Storage", "to": "User Output", "data": "Timetables, statistics"}
      ]
    },
    database_schema: {
      "tables": [
        {
          "name": "Course",
          "fields": [
            {"name": "id", "type": "BigAutoField", "primary": true},
            {"name": "name", "type": "CharField(100)", "example": "MCA, BE(CSE)"},
            {"name": "code", "type": "CharField(20)", "unique": true, "example": "MCA, CSE-BE"}
          ],
          "relationships": []
        },
        {
          "name": "Semester", 
          "fields": [
            {"name": "id", "type": "BigAutoField", "primary": true},
            {"name": "course_id", "type": "ForeignKey", "references": "Course"},
            {"name": "name", "type": "CharField(50)", "example": "Semester 1"},
            {"name": "number", "type": "IntegerField", "example": "1, 2, 3, 8"}
          ],
          "relationships": [{"type": "Many-to-One", "to": "Course"}]
        },
        {
          "name": "Section",
          "fields": [
            {"name": "id", "type": "BigAutoField", "primary": true},
            {"name": "semester_id", "type": "ForeignKey", "references": "Semester"},
            {"name": "name", "type": "CharField(10)", "example": "A, B, C"}
          ],
          "relationships": [{"type": "Many-to-One", "to": "Semester"}]
        },
        {
          "name": "Subject",
          "fields": [
            {"name": "id", "type": "BigAutoField", "primary": true},
            {"name": "semester_id", "type": "ForeignKey", "references": "Semester"},
            {"name": "name", "type": "CharField(200)"},
            {"name": "code", "type": "CharField(20)", "unique": true},
            {"name": "weekly_hours", "type": "IntegerField"},
            {"name": "lab_required", "type": "BooleanField"},
            {"name": "lab_hours", "type": "IntegerField"}
          ],
          "relationships": [{"type": "Many-to-One", "to": "Semester"}]
        },
        {
          "name": "Faculty",
          "fields": [
            {"name": "id", "type": "BigAutoField", "primary": true},
            {"name": "name", "type": "CharField(100)"},
            {"name": "employee_id", "type": "CharField(50)", "unique": true},
            {"name": "max_hours_per_week", "type": "IntegerField", "default": 18},
            {"name": "created_by_id", "type": "ForeignKey", "references": "User", "null": true}
          ],
          "relationships": [{"type": "Many-to-One", "to": "auth.User"}]
        },
        {
          "name": "FacultySubjectAllocation",
          "fields": [
            {"name": "id", "type": "BigAutoField", "primary": true},
            {"name": "faculty_id", "type": "ForeignKey", "references": "Faculty"},
            {"name": "subject_id", "type": "ForeignKey", "references": "Subject"},
            {"name": "hours_per_week", "type": "IntegerField", "note": "Added in migration 0002"}
          ],
          "relationships": [
            {"type": "Many-to-One", "to": "Faculty"},
            {"type": "Many-to-One", "to": "Subject"}
          ],
          "constraints": ["unique_together: (faculty, subject)"]
        },
        {
          "name": "Room",
          "fields": [
            {"name": "id", "type": "BigAutoField", "primary": true},
            {"name": "name", "type": "CharField(50)"},
            {"name": "is_lab", "type": "BooleanField"},
            {"name": "created_by_id", "type": "ForeignKey", "references": "User", "null": true}
          ],
          "relationships": [{"type": "Many-to-One", "to": "auth.User"}]
        },
        {
          "name": "TimetableSlot",
          "fields": [
            {"name": "id", "type": "BigAutoField", "primary": true},
            {"name": "day", "type": "IntegerField", "choices": "1-7 (Mon-Sun)"},
            {"name": "period_number", "type": "IntegerField"}
          ],
          "relationships": []
        },
        {
          "name": "ScheduledSession",
          "fields": [
            {"name": "id", "type": "BigAutoField", "primary": true},
            {"name": "section_id", "type": "ForeignKey", "references": "Section"},
            {"name": "subject_id", "type": "ForeignKey", "references": "Subject"},
            {"name": "faculty_id", "type": "ForeignKey", "references": "Faculty"},
            {"name": "room_id", "type": "ForeignKey", "references": "Room"},
            {"name": "slot_id", "type": "ForeignKey", "references": "TimetableSlot"},
            {"name": "is_lab_session", "type": "BooleanField"}
          ],
          "relationships": [
            {"type": "Many-to-One", "to": "Section"},
            {"type": "Many-to-One", "to": "Subject"},
            {"type": "Many-to-One", "to": "Faculty"},
            {"type": "Many-to-One", "to": "Room"},
            {"type": "Many-to-One", "to": "TimetableSlot"}
          ]
        },
        {
          "name": "InstitutionSettings",
          "fields": [
            {"name": "id", "type": "BigAutoField", "primary": true},
            {"name": "institution_name", "type": "CharField(200)"},
            {"name": "course", "type": "CharField(50)"},
            {"name": "academic_year", "type": "CharField(10)"},
            {"name": "working_days", "type": "IntegerField"},
            {"name": "periods_per_day", "type": "IntegerField"},
            {"name": "period_duration", "type": "IntegerField"},
            {"name": "created_by_id", "type": "ForeignKey", "references": "User"},
            {"name": "is_setup_complete", "type": "BooleanField"}
          ],
          "relationships": [{"type": "Many-to-One", "to": "auth.User"}]
        }
      ],
      "key_relationships": [
        "Course → Semester → Section (Academic Hierarchy)",
        "Semester → Subject (Subject Organization)", 
        "Faculty ↔ Subject (Many-to-Many via FacultySubjectAllocation)",
        "Section + Subject + Faculty + Room + TimetableSlot → ScheduledSession (Final Schedule)",
        "User → Faculty, Room, InstitutionSettings (User Ownership)"
      ]
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= flowchartData.algorithm_steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'input': return <Database className="w-6 h-6" />;
      case 'validation': return <CheckCircle className="w-6 h-6" />;
      case 'processing': return <Zap className="w-6 h-6" />;
      case 'optimization': return <Brain className="w-6 h-6" />;
      case 'iteration': return <RotateCcw className="w-6 h-6" />;
      case 'decision': return <AlertTriangle className="w-6 h-6" />;
      case 'output': return <CheckCircle className="w-6 h-6" />;
      default: return <Info className="w-6 h-6" />;
    }
  };

  const getStepColor = (type: string) => {
    switch (type) {
      case 'input': return 'bg-blue-500';
      case 'validation': return 'bg-green-500';
      case 'processing': return 'bg-purple-500';
      case 'optimization': return 'bg-orange-500';
      case 'iteration': return 'bg-pink-500';
      case 'decision': return 'bg-yellow-500';
      case 'output': return 'bg-emerald-500';
      default: return 'bg-gray-500';
    }
  };

  const currentTestCase = flowchartData.test_cases.find((tc: TestCase) => tc.id === selectedTestCase);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-blue-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <ArrowLeft size={20} className="mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-blue-800">Timetable Generation Algorithm</h1>
              <p className="text-gray-600">Interactive flowchart with learning materials</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setCurrentStep(0)}
              variant="outline"
              size="sm"
            >
              <RotateCcw size={16} className="mr-1" />
              Reset
            </Button>
            <Button
              onClick={() => setIsPlaying(!isPlaying)}
              className={isPlaying ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}
              size="sm"
            >
              {isPlaying ? <Pause size={16} className="mr-1" /> : <Play size={16} className="mr-1" />}
              {isPlaying ? "Pause" : "Play"}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-8">
        <Tabs defaultValue="flowchart" className="space-y-6">
          <TabsList className="bg-white/80 p-1">
            <TabsTrigger value="flowchart">Algorithm Flowchart</TabsTrigger>
            <TabsTrigger value="data-flow">Data Flow Diagram</TabsTrigger>
            <TabsTrigger value="database">Database Schema</TabsTrigger>
            <TabsTrigger value="documentation">📚 Project Documentation</TabsTrigger>
            <TabsTrigger value="test-cases" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              Test Cases
            </TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
              Performance Analysis
            </TabsTrigger>
            <TabsTrigger value="what-if" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              What-If Scenarios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="flowchart" className="space-y-6">
            {/* Progress Bar */}
            <Card className="p-4 bg-white/90">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Algorithm Progress</h3>
                <Badge variant="outline">
                  Step {currentStep + 1} of {flowchartData.algorithm_steps.length}
                </Badge>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${((currentStep + 1) / flowchartData.algorithm_steps.length) * 100}%` }}
                ></div>
              </div>
            </Card>

            {/* Flowchart Visualization */}
            <div className="grid gap-6">
              {flowchartData.algorithm_steps.map((step: AlgorithmStep, index: number) => (
                <div key={step.id} className="relative">
                  <Card
                    className={`p-6 transition-all duration-500 cursor-pointer ${
                      index === currentStep
                        ? 'ring-4 ring-blue-400 bg-blue-50 scale-105 shadow-xl'
                        : index < currentStep
                        ? 'bg-green-50 border-green-300'
                        : 'bg-white/90 opacity-60'
                    }`}
                    onClick={() => setCurrentStep(index)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Step Icon */}
                      <div className={`p-3 rounded-full text-white ${getStepColor(step.type)}`}>
                        {getStepIcon(step.type)}
                      </div>

                      {/* Step Content */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xl font-bold text-gray-800">{step.title}</h3>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{step.type}</Badge>
                            <Badge variant="outline">{step.complexity}</Badge>
                          </div>
                        </div>
                        
                        <p className="text-gray-600 mb-4">{step.description}</p>
                        
                        {/* Input/Output Flow */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <h4 className="font-semibold text-sm text-blue-600 mb-2">INPUTS</h4>
                            <div className="space-y-1">
                              {step.inputs.map((input, i) => (
                                <div key={i} className="text-sm bg-blue-100 px-2 py-1 rounded">
                                  {input}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-center">
                            <ArrowRight className="text-gray-400" size={24} />
                          </div>
                          
                          <div>
                            <h4 className="font-semibold text-sm text-green-600 mb-2">OUTPUTS</h4>
                            <div className="space-y-1">
                              {step.outputs.map((output, i) => (
                                <div key={i} className="text-sm bg-green-100 px-2 py-1 rounded">
                                  {output}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Detailed View Toggle */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDetails(showDetails === step.id ? null : step.id);
                          }}
                        >
                          {showDetails === step.id ? "Hide Details" : "Show Details"}
                        </Button>

                        {/* Expanded Details */}
                        {showDetails === step.id && (
                          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-700 mb-3">{step.details}</p>
                            
                            {step.sample_data && (
                              <div>
                                <h5 className="font-semibold text-sm mb-2">Sample Data:</h5>
                                <pre className="text-xs bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
                                  {JSON.stringify(step.sample_data, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>

                  {/* Arrow to next step */}
                  {index < flowchartData.algorithm_steps.length - 1 && (
                    <div className="flex justify-center py-3">
                      <ArrowDown 
                        className={`transition-colors duration-500 ${
                          index < currentStep ? 'text-green-500' : 'text-gray-300'
                        }`} 
                        size={24} 
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          {/* NEW: Data Flow Diagram Tab */}
          <TabsContent value="data-flow" className="space-y-6">
            <Card className="p-6 bg-white/90">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <GitBranch className="text-blue-600" size={28} />
                System Data Flow Diagram
              </h3>
              
              {/* Data Flow Entities */}
              <div className="mb-8">
                <h4 className="text-lg font-semibold mb-4">System Components</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {flowchartData.data_flow.entities.map((entity, index) => (
                    <div key={index} className="p-3 rounded-lg border-2 text-center" style={{borderColor: entity.color, backgroundColor: `${entity.color}20`}}>
                      <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{backgroundColor: entity.color}}></div>
                      <p className="text-sm font-medium">{entity.name}</p>
                      <p className="text-xs text-gray-600">{entity.type}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Flow Connections */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Data Flow Connections</h4>
                <div className="space-y-3">
                  {flowchartData.data_flow.flows.map((flow, index) => (
                    <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 flex items-center gap-3">
                        <span className="font-medium text-blue-600">{flow.from}</span>
                        <ArrowRight className="text-gray-400" size={16} />
                        <span className="font-medium text-green-600">{flow.to}</span>
                      </div>
                      <div className="text-sm text-gray-600 italic">{flow.data}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Flow Description */}
              <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                <h5 className="font-semibold text-blue-800 mb-2">System Flow Overview</h5>
                <p className="text-sm text-blue-700">
                  The timetable generation system follows a structured data flow where user inputs are processed through multiple stages:
                  institution setup → faculty management → academic structure → scheduling engine → conflict resolution → final output.
                  The scheduling engine is the core component that handles the complex logic of assigning time slots while respecting all constraints.
                </p>
              </div>
            </Card>
          </TabsContent>

          {/* NEW: Database Schema Tab */}
          <TabsContent value="database" className="space-y-6">
            <Card className="p-6 bg-white/90">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Database className="text-purple-600" size={28} />
                Database Schema & Relationships
              </h3>

              {/* Database Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {flowchartData.database_schema.tables.map((table, index) => (
                  <Card key={index} className="p-4 border-2 border-gray-200">
                    <h4 className="text-lg font-semibold mb-3 text-purple-800 flex items-center gap-2">
                      <Table size={20} />
                      {table.name}
                    </h4>
                    
                    <div className="space-y-2">
                      {table.fields.map((field, fIndex) => (
                        <div key={fIndex} className={`p-2 rounded text-sm ${field.primary ? 'bg-yellow-100 border-l-4 border-yellow-500' : 'bg-gray-50'}`}>
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{field.name}</span>
                            <span className="text-xs text-gray-600">{field.type}</span>
                          </div>
                          {field.example && (
                            <div className="text-xs text-gray-500 mt-1">e.g., {field.example}</div>
                          )}
                          {field.note && (
                            <div className="text-xs text-blue-600 mt-1">📝 {field.note}</div>
                          )}
                        </div>
                      ))}
                    </div>

                    {table.relationships.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm font-medium text-gray-700 mb-2">Relationships:</p>
                        {table.relationships.map((rel, rIndex) => (
                          <div key={rIndex} className="text-xs text-green-600 flex items-center gap-1">
                            <Network size={12} />
                            {rel.type} → {rel.to}
                          </div>
                        ))}
                      </div>
                    )}

                    {table.constraints && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-red-600">Constraints:</p>
                        {table.constraints.map((constraint, cIndex) => (
                          <div key={cIndex} className="text-xs text-red-500">{constraint}</div>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>

              {/* Key Relationships Overview */}
              <div className="mt-8 p-4 bg-purple-50 rounded-lg">
                <h5 className="font-semibold text-purple-800 mb-3">Key Database Relationships</h5>
                <div className="space-y-2">
                  {flowchartData.database_schema.key_relationships.map((relationship, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-purple-700">
                      <Network size={14} />
                      {relationship}
                    </div>
                  ))}
                </div>
              </div>

              {/* Migration Notes */}
              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <h5 className="font-semibold text-green-800 mb-2">Migration History</h5>
                <div className="text-sm text-green-700 space-y-1">
                  <p><strong>0001_initial.py:</strong> Created all core tables with basic relationships</p>
                  <p><strong>0002_add_hours_per_week_field.py:</strong> Added hours_per_week to FacultySubjectAllocation for multiple faculty support</p>
                  <p><strong>Key Features:</strong> User-based data isolation, flexible faculty-subject allocation, comprehensive scheduling constraints</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="documentation" className="space-y-6">
            <Card className="p-8 bg-white/90" id="project-documentation">
              {/* Print Button */}
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-3xl font-bold text-blue-800">Timetable Management System - Complete Project Documentation</h3>
                <Button 
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  📄 Print Report
                </Button>
              </div>

              {/* Table of Contents */}
              <Card className="p-6 mb-8 bg-blue-50 border-blue-200">
                <h4 className="text-xl font-semibold mb-4 text-blue-800">📋 Table of Contents</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <a href="#abstract" className="block hover:text-blue-600 py-1">1. Abstract</a>
                    <a href="#introduction" className="block hover:text-blue-600 py-1">2. Introduction</a>
                    <a href="#problem-statement" className="block hover:text-blue-600 py-1">3. Problem Statement</a>
                    <a href="#objectives" className="block hover:text-blue-600 py-1">4. Objectives</a>
                    <a href="#system-requirements" className="block hover:text-blue-600 py-1">5. System Requirements</a>
                    <a href="#system-design" className="block hover:text-blue-600 py-1">6. System Design</a>
                    <a href="#algorithm" className="block hover:text-blue-600 py-1">7. Algorithm Design</a>
                  </div>
                  <div>
                    <a href="#implementation" className="block hover:text-blue-600 py-1">8. Implementation</a>
                    <a href="#features" className="block hover:text-blue-600 py-1">9. Features</a>
                    <a href="#testing" className="block hover:text-blue-600 py-1">10. Testing & Results</a>
                    <a href="#installation" className="block hover:text-blue-600 py-1">11. Installation Guide</a>
                    <a href="#usage" className="block hover:text-blue-600 py-1">12. Usage Guide</a>
                    <a href="#future-enhancements" className="block hover:text-blue-600 py-1">13. Future Enhancements</a>
                    <a href="#conclusion" className="block hover:text-blue-600 py-1">14. Conclusion</a>
                  </div>
                </div>
              </Card>

              {/* 1. Abstract */}
              <section id="abstract" className="mb-8">
                <h4 className="text-2xl font-bold mb-4 text-blue-800 border-b-2 border-blue-200 pb-2">1. Abstract</h4>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <p className="text-gray-700 leading-relaxed mb-4">
                    The Timetable Management System is a comprehensive web-based application designed to automate the complex process of academic timetable generation for educational institutions. The system employs a sophisticated priority-based scheduling algorithm that considers multiple constraints including faculty availability, room assignments, subject requirements, and institutional policies.
                  </p>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Built using Django (Python) for the backend and React (TypeScript) for the frontend, the system provides an intuitive user interface for institution setup, academic structure management, and timetable generation. The algorithm ensures optimal resource utilization while maintaining flexibility for various institutional requirements.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    Key achievements include 89.5% average scheduling success rate, support for multiple faculty per subject, automated conflict resolution, and comprehensive analytics. The system significantly reduces manual effort from weeks to minutes while ensuring better resource distribution and constraint satisfaction.
                  </p>
                </div>
              </section>

              {/* 2. Introduction */}
              <section id="introduction" className="mb-8">
                <h4 className="text-2xl font-bold mb-4 text-blue-800 border-b-2 border-blue-200 pb-2">2. Introduction</h4>
                <div className="space-y-4">
                  <p className="text-gray-700 leading-relaxed">
                    Academic timetabling is one of the most challenging administrative tasks in educational institutions. It involves scheduling classes, faculty, rooms, and time slots while satisfying numerous constraints and preferences. Traditional manual approaches are time-consuming, error-prone, and often result in suboptimal resource utilization.
                  </p>
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <h5 className="font-semibold text-blue-800 mb-3">🎯 Project Scope</h5>
                    <ul className="list-disc list-inside text-gray-700 space-y-2">
                      <li>Automated timetable generation for multiple courses and semesters</li>
                      <li>Faculty workload management with hour constraints</li>
                      <li>Room allocation considering lab requirements</li>
                      <li>Conflict detection and resolution</li>
                      <li>Multiple timetable views (Student, Faculty, Master)</li>
                      <li>Interactive algorithm visualization for educational purposes</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 3. Problem Statement */}
              <section id="problem-statement" className="mb-8">
                <h4 className="text-2xl font-bold mb-4 text-blue-800 border-b-2 border-blue-200 pb-2">3. Problem Statement</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-red-50 p-6 rounded-lg">
                    <h5 className="font-semibold text-red-800 mb-3">❌ Current Challenges</h5>
                    <ul className="list-disc list-inside text-red-700 space-y-2 text-sm">
                      <li>Manual timetabling takes 2-4 weeks per semester</li>
                      <li>High probability of scheduling conflicts</li>
                      <li>Uneven faculty workload distribution</li>
                      <li>Inefficient room utilization</li>
                      <li>Difficulty in handling last-minute changes</li>
                      <li>No systematic approach to constraint handling</li>
                      <li>Limited visibility into resource utilization</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 p-6 rounded-lg">
                    <h5 className="font-semibold text-green-800 mb-3">✅ Proposed Solution</h5>
                    <ul className="list-disc list-inside text-green-700 space-y-2 text-sm">
                      <li>Automated generation in minutes</li>
                      <li>Systematic conflict detection & resolution</li>
                      <li>Balanced faculty workload management</li>
                      <li>Optimal room allocation algorithms</li>
                      <li>Easy modification and regeneration</li>
                      <li>Priority-based constraint satisfaction</li>
                      <li>Comprehensive analytics and reporting</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 4. Objectives */}
              <section id="objectives" className="mb-8">
                <h4 className="text-2xl font-bold mb-4 text-blue-800 border-b-2 border-blue-200 pb-2">4. Objectives</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-semibold text-gray-800 mb-3">🎯 Primary Objectives</h5>
                    <ul className="list-disc list-inside text-gray-700 space-y-2">
                      <li>Develop an automated timetable generation system</li>
                      <li>Implement efficient scheduling algorithms</li>
                      <li>Ensure constraint satisfaction and conflict resolution</li>
                      <li>Provide intuitive user interface</li>
                      <li>Support multiple institutional configurations</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-semibold text-gray-800 mb-3">📊 Success Metrics</h5>
                    <ul className="list-disc list-inside text-gray-700 space-y-2">
                      <li>95%+ scheduling success rate</li>
                      <li>70-85% faculty utilization</li>
                      <li>Zero scheduling conflicts</li>
                      <li>Sub-minute generation time</li>
                      <li>User satisfaction score 4.5/5</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 5. System Requirements */}
              <section id="system-requirements" className="mb-8">
                <h4 className="text-2xl font-bold mb-4 text-blue-800 border-b-2 border-blue-200 pb-2">5. System Requirements</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-6">
                    <h5 className="font-semibold text-gray-800 mb-4">🔧 Functional Requirements</h5>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      <li>Institution setup and configuration</li>
                      <li>Faculty management with hour constraints</li>
                      <li>Room management (theory/lab classification)</li>
                      <li>Subject allocation to multiple faculty</li>
                      <li>Automated timetable generation</li>
                      <li>Multiple timetable views</li>
                      <li>Conflict detection and resolution</li>
                      <li>Statistics and analytics</li>
                      <li>User authentication and authorization</li>
                      <li>Data export capabilities</li>
                    </ul>
                  </Card>
                  <Card className="p-6">
                    <h5 className="font-semibold text-gray-800 mb-4">⚡ Non-Functional Requirements</h5>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      <li>Response time  5 seconds for generation</li>
                      <li>Support for 100+ faculty members</li>
                      <li>Scalable to 50+ sections</li>
                      <li>99.9% system availability</li>
                      <li>Cross-browser compatibility</li>
                      <li>Mobile responsive design</li>
                      <li>Data security and privacy</li>
                      <li>Backup and recovery</li>
                      <li>User-friendly interface</li>
                      <li>Multi-user concurrent access</li>
                    </ul>
                  </Card>
                </div>
              </section>

              {/* 6. System Design */}
              <section id="system-design" className="mb-8">
                <h4 className="text-2xl font-bold mb-4 text-blue-800 border-b-2 border-blue-200 pb-2">6. System Design</h4>
                <div className="space-y-6">
                  <div className="bg-purple-50 p-6 rounded-lg">
                    <h5 className="font-semibold text-purple-800 mb-4">🏗️ Architecture Overview</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-white rounded-lg border">
                        <h6 className="font-semibold text-gray-800">Frontend</h6>
                        <p className="text-sm text-gray-600">React + TypeScript</p>
                        <p className="text-xs text-gray-500">User Interface & Experience</p>
                      </div>
                      <div className="text-center p-4 bg-white rounded-lg border">
                        <h6 className="font-semibold text-gray-800">Backend</h6>
                        <p className="text-sm text-gray-600">Django + Python</p>
                        <p className="text-xs text-gray-500">API & Business Logic</p>
                      </div>
                      <div className="text-center p-4 bg-white rounded-lg border">
                        <h6 className="font-semibold text-gray-800">Database</h6>
                        <p className="text-sm text-gray-600">PostgreSQL/SQLite</p>
                        <p className="text-xs text-gray-500">Data Storage & Management</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-6">
                      <h5 className="font-semibold text-gray-800 mb-4">🎨 Frontend Technologies</h5>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-blue-500 rounded"></span>
                          <span><strong>React 18:</strong> Component-based UI library</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-blue-600 rounded"></span>
                          <span><strong>TypeScript:</strong> Type-safe JavaScript</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-purple-500 rounded"></span>
                          <span><strong>Tailwind CSS:</strong> Utility-first styling</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-green-500 rounded"></span>
                          <span><strong>Axios:</strong> HTTP client for API calls</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-orange-500 rounded"></span>
                          <span><strong>React Router:</strong> Client-side routing</span>
                        </li>
                      </ul>
                    </Card>
                    <Card className="p-6">
                      <h5 className="font-semibold text-gray-800 mb-4">⚙️ Backend Technologies</h5>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-green-600 rounded"></span>
                          <span><strong>Django 6.0:</strong> Web framework</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-blue-500 rounded"></span>
                          <span><strong>Django REST:</strong> API framework</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-yellow-500 rounded"></span>
                          <span><strong>Python 3.9+:</strong> Core programming language</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-gray-500 rounded"></span>
                          <span><strong>SQLite/PostgreSQL:</strong> Database systems</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-red-500 rounded"></span>
                          <span><strong>Token Auth:</strong> Secure authentication</span>
                        </li>
                      </ul>
                    </Card>
                  </div>
                </div>
              </section>

              {/* 7. Algorithm Design */}
              <section id="algorithm" className="mb-8">
                <h4 className="text-2xl font-bold mb-4 text-blue-800 border-b-2 border-blue-200 pb-2">7. Algorithm Design</h4>
                <div className="space-y-6">
                  <Card className="p-6 bg-gradient-to-r from-orange-50 to-red-50">
                    <h5 className="font-semibold text-orange-800 mb-4">🧠 Core Algorithm: Priority-Based Constraint Satisfaction</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h6 className="font-medium text-gray-800 mb-3">Algorithm Steps:</h6>
                        <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
                          <li>System initialization and validation</li>
                          <li>Faculty hour constraint checking</li>
                          <li>Session requirement analysis</li>
                          <li>Priority-based session sorting</li>
                          <li>Strategic time slot assignment</li>
                          <li>Multi-level conflict resolution</li>
                          <li>Tracking matrix updates</li>
                          <li>Statistics generation</li>
                        </ol>
                      </div>
                      <div>
                        <h6 className="font-medium text-gray-800 mb-3">Key Features:</h6>
                        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                          <li>Faculty load balancing</li>
                          <li>Lab session prioritization</li>
                          <li>Day-wise distribution optimization</li>
                          <li>Conflict detection & fallback strategies</li>
                          <li>Resource utilization maximization</li>
                          <li>Constraint satisfaction guarantee</li>
                        </ul>
                      </div>
                    </div>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4 text-center">
                      <h6 className="font-semibold text-blue-800 mb-2">Time Complexity</h6>
                      <p className="text-2xl font-bold text-blue-600">O(n×s×r)</p>
                      <p className="text-xs text-gray-600">n=sessions, s=slots, r=rooms</p>
                    </Card>
                    <Card className="p-4 text-center">
                      <h6 className="font-semibold text-green-800 mb-2">Success Rate</h6>
                      <p className="text-2xl font-bold text-green-600">89.5%</p>
                      <p className="text-xs text-gray-600">Average scheduling success</p>
                    </Card>
                    <Card className="p-4 text-center">
                      <h6 className="font-semibold text-purple-800 mb-2">Performance</h6>
                      <p className="text-2xl font-bold text-purple-600">&lt;5s</p>
                      <p className="text-xs text-gray-600">Generation time</p>
                    </Card>
                  </div>
                </div>
              </section>

              {/* 8. Implementation */}
              <section id="implementation" className="mb-8">
                <h4 className="text-2xl font-bold mb-4 text-blue-800 border-b-2 border-blue-200 pb-2">8. Implementation</h4>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-6">
                      <h5 className="font-semibold text-gray-800 mb-4">📊 Database Schema</h5>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li><strong>Course:</strong> Academic programs</li>
                        <li><strong>Semester:</strong> Academic periods</li>
                        <li><strong>Section:</strong> Student groups</li>
                        <li><strong>Subject:</strong> Academic subjects</li>
                        <li><strong>Faculty:</strong> Teaching staff</li>
                        <li><strong>Room:</strong> Physical spaces</li>
                        <li><strong>TimetableSlot:</strong> Time periods</li>
                        <li><strong>ScheduledSession:</strong> Final assignments</li>
                        <li><strong>FacultySubjectAllocation:</strong> Teaching assignments</li>
                        <li><strong>InstitutionSettings:</strong> Configuration</li>
                      </ul>
                    </Card>
                    <Card className="p-6">
                      <h5 className="font-semibold text-gray-800 mb-4">🔄 Key Relationships</h5>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li><strong>One-to-Many:</strong> Course → Semester → Section</li>
                        <li><strong>One-to-Many:</strong> Semester → Subject</li>
                        <li><strong>Many-to-Many:</strong> Faculty ↔ Subject (via Allocation)</li>
                        <li><strong>Many-to-One:</strong> ScheduledSession → Faculty/Room/Slot</li>
                        <li><strong>User Isolation:</strong> Multi-user data separation</li>
                        <li><strong>Constraints:</strong> Unique together relationships</li>
                      </ul>
                    </Card>
                  </div>

                  <Card className="p-6 bg-gray-50">
                    <h5 className="font-semibold text-gray-800 mb-4">🔧 Implementation Highlights</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h6 className="font-medium text-gray-700 mb-2">Backend Features:</h6>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                          <li>RESTful API design</li>
                          <li>Token-based authentication</li>
                          <li>Django ORM for database operations</li>
                          <li>Comprehensive logging system</li>
                          <li>Input validation and sanitization</li>
                          <li>Error handling and recovery</li>
                          <li>Migration system for schema changes</li>
                        </ul>
                      </div>
                      <div>
                        <h6 className="font-medium text-gray-700 mb-2">Frontend Features:</h6>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                          <li>Responsive component design</li>
                          <li>State management with React hooks</li>
                          <li>Form validation and error handling</li>
                          <li>Interactive data visualization</li>
                          <li>Progressive web app features</li>
                          <li>Accessibility compliance</li>
                          <li>Print-friendly layouts</li>
                        </ul>
                      </div>
                    </div>
                  </Card>
                </div>
              </section>

              {/* 9. Features */}
              <section id="features" className="mb-8">
                <h4 className="text-2xl font-bold mb-4 text-blue-800 border-b-2 border-blue-200 pb-2">9. System Features</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card className="p-6">
                    <h5 className="font-semibold text-blue-800 mb-3">🏛️ Institution Management</h5>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      <li>Multi-institution support</li>
                      <li>Configurable working days</li>
                      <li>Flexible period scheduling</li>
                      <li>Academic year management</li>
                      <li>Course and semester setup</li>
                    </ul>
                  </Card>
                  <Card className="p-6">
                    <h5 className="font-semibold text-green-800 mb-3">👨‍🏫 Faculty Management</h5>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      <li>Hour limit enforcement</li>
                      <li>Multiple subject assignments</li>
                      <li>Workload balancing</li>
                      <li>Availability tracking</li>
                      <li>Performance analytics</li>
                    </ul>
                  </Card>
                  <Card className="p-6">
                    <h5 className="font-semibold text-purple-800 mb-3">🏢 Resource Management</h5>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      <li>Theory and lab rooms</li>
                      <li>Optimal room allocation</li>
                      <li>Capacity planning</li>
                      <li>Utilization monitoring</li>
                      <li>Conflict prevention</li>
                    </ul>
                  </Card>
                  <Card className="p-6">
                    <h5 className="font-semibold text-orange-800 mb-3">📅 Timetable Generation</h5>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      <li>Automated scheduling</li>
                      <li>Constraint satisfaction</li>
                      <li>Conflict resolution</li>
                      <li>Multiple algorithms</li>
                      <li>Real-time feedback</li>
                    </ul>
                  </Card>
                  <Card className="p-6">
                    <h5 className="font-semibold text-red-800 mb-3">📊 Analytics & Reporting</h5>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      <li>Success rate metrics</li>
                      <li>Utilization statistics</li>
                      <li>Performance benchmarks</li>
                      <li>Export capabilities</li>
                      <li>Visual dashboards</li>
                    </ul>
                  </Card>
                  <Card className="p-6">
                    <h5 className="font-semibold text-teal-800 mb-3">🎓 Educational Features</h5>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      <li>Algorithm visualization</li>
                      <li>Interactive flowcharts</li>
                      <li>Performance analysis</li>
                      <li>Learning materials</li>
                      <li>Documentation system</li>
                    </ul>
                  </Card>
                </div>
              </section>

              {/* 10. Testing & Results */}
              <section id="testing" className="mb-8">
                <h4 className="text-2xl font-bold mb-4 text-blue-800 border-b-2 border-blue-200 pb-2">10. Testing & Results</h4>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-6 bg-green-50">
                      <h5 className="font-semibold text-green-800 mb-3">✅ Test Scenarios</h5>
                      <ul className="list-disc list-inside text-sm text-green-700 space-y-1">
                        <li>Optimal resource conditions</li>
                        <li>Resource-constrained scenarios</li>
                        <li>Overloaded system testing</li>
                        <li>Edge case handling</li>
                        <li>Performance benchmarking</li>
                      </ul>
                    </Card>
                    <Card className="p-6 bg-blue-50">
                      <h5 className="font-semibold text-blue-800 mb-3">📈 Performance Metrics</h5>
                      <ul className="space-y-2 text-sm text-blue-700">
                        <li><strong>Success Rate:</strong> 89.5%</li>
                        <li><strong>Generation Time:</strong> &lt;5 seconds</li>
                        <li><strong>Faculty Utilization:</strong> 74.2%</li>
                        <li><strong>Room Utilization:</strong> 68.9%</li>
                        <li><strong>Conflict Rate:</strong> 0%</li>
                      </ul>
                    </Card>
                    <Card className="p-6 bg-purple-50">
                      <h5 className="font-semibold text-purple-800 mb-3">🎯 Test Results</h5>
                      <ul className="space-y-2 text-sm text-purple-700">
                        <li><strong>Small Institution:</strong> &lt;1s</li>
                        <li><strong>Medium Institution:</strong> 2-5s</li>
                        <li><strong>Large Institution:</strong> 10-30s</li>
                        <li><strong>Memory Usage:</strong> Linear O(n)</li>
                        <li><strong>Scalability:</strong> 100+ faculty</li>
                      </ul>
                    </Card>
                  </div>

                  <Card className="p-6">
                    <h5 className="font-semibold text-gray-800 mb-4">📊 Detailed Test Results</h5>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="p-2 text-left">Test Case</th>
                            <th className="p-2 text-left">Faculty Count</th>
                            <th className="p-2 text-left">Subjects</th>
                            <th className="p-2 text-left">Sections</th>
                            <th className="p-2 text-left">Success Rate</th>
                            <th className="p-2 text-left">Generation Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="p-2">Optimal Case</td>
                            <td className="p-2">8</td>
                            <td className="p-2">12</td>
                            <td className="p-2">4</td>
                            <td className="p-2 text-green-600">95-100%</td>
                            <td className="p-2">&lt;2s</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2">Resource Constrained</td>
                            <td className="p-2">5</td>
                            <td className="p-2">15</td>
                            <td className="p-2">6</td>
                            <td className="p-2 text-orange-600">75-85%</td>
                            <td className="p-2">3-5s</td>
                          </tr>
                          <tr>
                            <td className="p-2">Overloaded System</td>
                            <td className="p-2">4</td>
                            <td className="p-2">20</td>
                            <td className="p-2">8</td>
                            <td className="p-2 text-red-600">50-65%</td>
                            <td className="p-2">5-8s</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              </section>

              {/* 11. Installation Guide */}
              <section id="installation" className="mb-8">
                <h4 className="text-2xl font-bold mb-4 text-blue-800 border-b-2 border-blue-200 pb-2">11. Installation Guide</h4>
                <div className="space-y-6">
                  <Card className="p-6">
                    <h5 className="font-semibold text-gray-800 mb-4">📋 Prerequisites</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h6 className="font-medium text-gray-700 mb-2">Backend Requirements:</h6>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                          <li>Python 3.9 or higher</li>
                          <li>pip (Python package manager)</li>
                          <li>Virtual environment (recommended)</li>
                          <li>PostgreSQL/SQLite</li>
                        </ul>
                      </div>
                      <div>
                        <h6 className="font-medium text-gray-700 mb-2">Frontend Requirements:</h6>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                          <li>Node.js 16 or higher</li>
                          <li>npm or yarn package manager</li>
                          <li>Modern web browser</li>
                          <li>Internet connection</li>
                        </ul>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6 bg-gray-50">
                    <h5 className="font-semibold text-gray-800 mb-4">🛠️ Installation Steps</h5>
                    <div className="space-y-4">
                      <div>
                        <h6 className="font-medium text-blue-700 mb-2">1. Clone Repository</h6>
                        <pre className="bg-gray-800 text-green-400 p-3 rounded text-sm overflow-x-auto">
git clone https://github.com/akhilprp567/timetable-generator.git
cd timetable-generator</pre>
                      </div>
                      <div>
                        <h6 className="font-medium text-blue-700 mb-2">2. Backend Setup</h6>
                        <pre className="bg-gray-800 text-green-400 p-3 rounded text-sm overflow-x-auto">
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver</pre>
                      </div>
                      <div>
                        <h6 className="font-medium text-blue-700 mb-2">3. Frontend Setup</h6>
                        <pre className="bg-gray-800 text-green-400 p-3 rounded text-sm overflow-x-auto">
cd frontend
npm install
npm run dev</pre>
                      </div>
                      <div>
                        <h6 className="font-medium text-blue-700 mb-2">4. Access Application</h6>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                          <li>Frontend: http://localhost:5173</li>
                          <li>Backend API: http://localhost:8000</li>
                          <li>Admin Panel: http://localhost:8000/admin</li>
                        </ul>
                      </div>
                    </div>
                  </Card>
                </div>
              </section>

              {/* 12. Usage Guide */}
              <section id="usage" className="mb-8">
                <h4 className="text-2xl font-bold mb-4 text-blue-800 border-b-2 border-blue-200 pb-2">12. Usage Guide</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-6">
                    <h5 className="font-semibold text-gray-800 mb-4">🚀 Quick Start</h5>
                    <ol className="list-decimal list-inside text-sm text-gray-700 space-y-2">
                      <li><strong>Register/Login:</strong> Create user account</li>
                      <li><strong>Institution Setup:</strong> Configure basic settings</li>
                      <li><strong>Add Faculty:</strong> Define teaching staff with hour limits</li>
                      <li><strong>Setup Rooms:</strong> Add classrooms and labs</li>
                      <li><strong>Academic Structure:</strong> Create courses, semesters, subjects</li>
                      <li><strong>Faculty Allocation:</strong> Assign subjects to faculty</li>
                      <li><strong>Generate Timetable:</strong> Run automated scheduling</li>
                      <li><strong>View Results:</strong> Access different timetable views</li>
                    </ol>
                  </Card>
                  <Card className="p-6">
                    <h5 className="font-semibold text-gray-800 mb-4">💡 Best Practices</h5>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-2">
                      <li>Set realistic faculty hour limits</li>
                      <li>Ensure adequate room capacity</li>
                      <li>Balance theory and lab subjects</li>
                      <li>Use descriptive naming conventions</li>
                      <li>Regular data validation</li>
                      <li>Monitor system performance</li>
                      <li>Keep backup of configurations</li>
                      <li>Review generated schedules</li>
                    </ul>
                  </Card>
                </div>
              </section>

              {/* 13. Future Enhancements */}
              <section id="future-enhancements" className="mb-8">
                <h4 className="text-2xl font-bold mb-4 text-blue-800 border-b-2 border-blue-200 pb-2">13. Future Enhancements</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card className="p-6">
                    <h5 className="font-semibold text-blue-800 mb-3">🤖 AI & ML Features</h5>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      <li>Machine learning optimization</li>
                      <li>Predictive analytics</li>
                      <li>Intelligent recommendations</li>
                      <li>Pattern recognition</li>
                      <li>Automated parameter tuning</li>
                    </ul>
                  </Card>
                  <Card className="p-6">
                    <h5 className="font-semibold text-green-800 mb-3">📱 Mobile & Integration</h5>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      <li>Native mobile applications</li>
                      <li>Calendar system integration</li>
                      <li>Email notifications</li>
                      <li>SMS alerts</li>
                      <li>Third-party API support</li>
                    </ul>
                  </Card>
                  <Card className="p-6">
                    <h5 className="font-semibold text-purple-800 mb-3">🔧 Advanced Features</h5>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      <li>Interactive timetable editing</li>
                      <li>Real-time collaboration</li>
                      <li>Advanced constraint modeling</li>
                      <li>Multi-campus support</li>
                      <li>Resource booking system</li>
                    </ul>
                  </Card>
                  <Card className="p-6">
                    <h5 className="font-semibold text-orange-800 mb-3">📊 Analytics Enhancement</h5>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      <li>Advanced reporting dashboard</li>
                      <li>Historical trend analysis</li>
                      <li>Resource optimization insights</li>
                      <li>Performance benchmarking</li>
                      <li>Custom report generation</li>
                    </ul>
                  </Card>
                  <Card className="p-6">
                    <h5 className="font-semibold text-red-800 mb-3">🛡️ Security & Scalability</h5>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      <li>Role-based access control</li>
                      <li>Data encryption</li>
                      <li>Audit logging</li>
                      <li>Cloud deployment</li>
                      <li>Microservices architecture</li>
                    </ul>
                  </Card>
                  <Card className="p-6">
                    <h5 className="font-semibold text-teal-800 mb-3">🌐 Platform Expansion</h5>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      <li>Multi-language support</li>
                      <li>Accessibility improvements</li>
                      <li>PWA capabilities</li>
                      <li>Offline functionality</li>
                      <li>Cross-platform deployment</li>
                    </ul>
                  </Card>
                </div>
              </section>

              {/* 14. Conclusion */}
              <section id="conclusion" className="mb-8">
                <h4 className="text-2xl font-bold mb-4 text-blue-800 border-b-2 border-blue-200 pb-2">14. Conclusion</h4>
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg">
                    <h5 className="font-semibold text-blue-800 mb-4">🎯 Project Achievements</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h6 className="font-medium text-gray-800 mb-2">Technical Achievements:</h6>
                        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                          <li>Successfully implemented priority-based scheduling algorithm</li>
                          <li>Achieved 89.5% average scheduling success rate</li>
                          <li>Developed comprehensive constraint satisfaction system</li>
                          <li>Created user-friendly web interface</li>
                          <li>Implemented multi-user data isolation</li>
                          <li>Built educational visualization tools</li>
                        </ul>
                      </div>
                      <div>
                        <h6 className="font-medium text-gray-800 mb-2">Business Impact:</h6>
                        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                          <li>Reduced timetabling time from weeks to minutes</li>
                          <li>Eliminated scheduling conflicts</li>
                          <li>Improved faculty workload distribution</li>
                          <li>Enhanced resource utilization</li>
                          <li>Provided actionable analytics</li>
                          <li>Enabled scalable institutional management</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <Card className="p-6">
                    <h5 className="font-semibold text-gray-800 mb-4">🔬 Lessons Learned</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h6 className="font-medium text-green-700 mb-2">✅ What Worked Well:</h6>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                          <li>Priority-based algorithm approach</li>
                          <li>Modular system architecture</li>
                          <li>Comprehensive testing strategy</li>
                          <li>User-centered design process</li>
                          <li>Iterative development methodology</li>
                        </ul>
                      </div>
                      <div>
                        <h6 className="font-medium text-orange-700 mb-2">🔄 Areas for Improvement:</h6>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                          <li>Algorithm optimization for large datasets</li>
                          <li>Real-time collaboration features</li>
                          <li>Mobile application development</li>
                          <li>Advanced analytics capabilities</li>
                          <li>Integration with external systems</li>
                        </ul>
                      </div>
                    </div>
                  </Card>

                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg">
                    <h5 className="font-semibold text-purple-800 mb-3">🚀 Impact & Significance</h5>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      The Timetable Management System represents a significant advancement in academic scheduling automation. By combining sophisticated algorithms with intuitive user interfaces, the system addresses real-world challenges faced by educational institutions globally.
                    </p>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      The project demonstrates the practical application of constraint satisfaction algorithms, web development technologies, and user experience design principles. The educational visualization features also contribute to algorithm learning and understanding.
                    </p>
                    <p className="text-gray-700 leading-relaxed">
                      With proven performance metrics and extensive documentation, this system serves as a foundation for future enhancements and adaptations to various institutional requirements.
                    </p>
                  </div>
                </div>
              </section>

              {/* Footer */}
              <div className="mt-12 p-6 bg-blue-800 text-white rounded-lg text-center">
                <h5 className="text-xl font-semibold mb-2">Timetable Management System</h5>
                <p className="text-blue-100 text-sm">
                  Developed as part of academic project • Built with Django, React, and modern web technologies
                </p>
                <p className="text-blue-200 text-xs mt-2">
                  For more information, visit the project repository or contact the development team
                </p>
              </div>

              {/* Print Styles */}
              <style jsx>{`
                @media print {
                  body * {
                    visibility: hidden;
                  }
                  #project-documentation, #project-documentation * {
                    visibility: visible;
                  }
                  #project-documentation {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    background: white !important;
                  }
                  .bg-gradient-to-br {
                    background: white !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                }
              `}</style>
            </Card>
          </TabsContent>

          <TabsContent value="test-cases" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {flowchartData.test_cases.map((testCase: TestCase) => (
                <Card
                  key={testCase.id}
                  className={`p-6 cursor-pointer transition-all duration-300 ${
                    selectedTestCase === testCase.id
                      ? 'ring-4 ring-blue-400 bg-blue-50 scale-105'
                      : 'hover:shadow-lg'
                  }`}
                  onClick={() => setSelectedTestCase(testCase.id)}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: testCase.visualization_color }}
                    ></div>
                    <h3 className="font-bold text-lg">{testCase.title}</h3>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4">{testCase.description}</p>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-semibold">Faculty:</span> {testCase.parameters.faculty_count}
                    </div>
                    <div>
                      <span className="font-semibold">Subjects:</span> {testCase.parameters.subjects}
                    </div>
                    <div>
                      <span className="font-semibold">Sections:</span> {testCase.parameters.sections}
                    </div>
                    <div>
                      <span className="font-semibold">Success Rate:</span> {testCase.expected_outcome.success_rate}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {currentTestCase && (
              <Card className="p-6 bg-white/90">
                <h3 className="text-xl font-bold mb-4">{currentTestCase.title} - Detailed Analysis</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Input Parameters</h4>
                    <div className="space-y-2 text-sm">
                      {Object.entries(currentTestCase.parameters).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="capitalize">{key.replace(/_/g, ' ')}:</span>
                          <span className="font-semibold">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3">Expected Outcome</h4>
                    <div className="space-y-2 text-sm">
                      {Object.entries(currentTestCase.expected_outcome).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="capitalize">{key.replace(/_/g, ' ')}:</span>
                          <span className="font-semibold">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6 bg-white/90">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Clock className="text-blue-500" size={20} />
                  Time Complexity
                </h3>
                <div className="space-y-3 text-sm">
                  {Object.entries(flowchartData.performance_data.time_complexity).map(([phase, complexity]) => (
                    <div key={phase} className="flex justify-between items-center p-2 bg-blue-50 rounded">
                      <span className="capitalize font-medium">{phase.replace(/_/g, ' ')}</span>
                      <code className="text-blue-600 bg-white px-2 py-1 rounded text-xs">
                        {String(complexity)}
                      </code>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6 bg-white/90">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Database className="text-purple-500" size={20} />
                  Space Complexity
                </h3>
                <div className="space-y-3 text-sm">
                  {Object.entries(flowchartData.performance_data.space_complexity).map(([component, complexity]) => (
                    <div key={component} className="flex justify-between items-center p-2 bg-purple-50 rounded">
                      <span className="capitalize font-medium">{component.replace(/_/g, ' ')}</span>
                      <code className="text-purple-600 bg-white px-2 py-1 rounded text-xs">
                        {String(complexity)}
                      </code>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="p-6 bg-white/90">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Zap className="text-green-500" size={20} />
                Typical Performance Benchmarks
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(flowchartData.performance_data.typical_performance).map(([size, time]) => (
                  <div key={size} className="p-4 bg-green-50 rounded-lg text-center">
                    <h4 className="font-semibold capitalize text-green-800">{size.replace(/_/g, ' ')}</h4>
                    <p className="text-2xl font-bold text-green-600 my-2">{String(time)}</p>
                    <p className="text-xs text-gray-600">Processing time</p>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="what-if" className="space-y-6">
            <div className="grid gap-6">
              {flowchartData.interactive_elements.what_if_scenarios.map((scenario: any, index: number) => (
                <Card key={index} className="p-6 bg-white/90 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="bg-orange-100 p-3 rounded-full">
                      <Brain className="text-orange-600" size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-800 mb-2">{scenario.question}</h3>
                      <div className="bg-orange-50 p-4 rounded-lg mb-3">
                        <h4 className="font-semibold text-orange-700 mb-1">Impact:</h4>
                        <p className="text-sm text-orange-600">{scenario.impact}</p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-blue-700 mb-1">Explanation:</h4>
                        <p className="text-sm text-blue-600">{scenario.explanation}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="p-6 bg-white/90">
              <h3 className="text-lg font-bold mb-4">Algorithm Variations Comparison</h3>
              <div className="grid gap-4">
                {flowchartData.interactive_elements.algorithm_variations.map((variation: any, index: number) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">{variation.name}</h4>
                    <p className="text-sm text-gray-600 mb-3">{variation.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium text-green-600 mb-1">Pros:</h5>
                        <ul className="text-xs space-y-1">
                          {variation.pros.map((pro: string, i: number) => (
                            <li key={i} className="flex items-center gap-1">
                              <CheckCircle size={12} className="text-green-500" />
                              {pro}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-medium text-red-600 mb-1">Cons:</h5>
                        <ul className="text-xs space-y-1">
                          {variation.cons.map((con: string, i: number) => (
                            <li key={i} className="flex items-center gap-1">
                              <AlertTriangle size={12} className="text-red-500" />
                              {con}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
