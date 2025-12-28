import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Building2, BookOpen, Users, Home, CheckCircle2, Info, CalendarDays, Loader2, Plus, Trash2, AlertCircle } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const steps = [
	{ value: "step1", label: "Institute", icon: <Building2 size={18} className="text-blue-500" /> },
	{ value: "step2", label: "Infrastructure", icon: <BookOpen size={18} className="text-purple-500" /> },
	{ value: "step3", label: "Faculty", icon: <Users size={18} className="text-green-500" /> },
	{ value: "step4", label: "Academic", icon: <Home size={18} className="text-pink-500" /> },
	{ value: "step5", label: "Review", icon: <CheckCircle2 size={18} className="text-indigo-500" /> },
];

export default function SetupWizard() {
	const [step, setStep] = useState("step1");
	const [setupMode, setSetupMode] = useState<"first_time" | "academic_only">("first_time");
	const [existingSetup, setExistingSetup] = useState<any>(null);
	const navigate = useNavigate();

	const [formData, setFormData] = useState({
		institute: {
			name: "",
			academicYear: "",
			course: "",
			totalSemesters: 5,
			workingDays: 5,
			periodsPerDay: 6,
			periodDuration: 60,
		},
		rooms: [{ name: "", isLab: false }],
		faculties: [{ name: "", empId: "", maxHours: 18 }],
		academics: [
			{
				semester: 1,
				sections: [""],
				subjects: [{ 
					name: "", 
					facultyAssignments: [{ faculty: "", hoursPerWeek: 3 }], 
					weeklyHours: 3, 
					isLab: false 
				}],
			},
		],
	});

	const [errorDetails, setErrorDetails] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const handleAddSemester = () => {
		const nextSemester =
			formData.academics.length > 0
				? formData.academics[formData.academics.length - 1].semester + 1
				: 1;
		setFormData({
			...formData,
			academics: [
				...formData.academics,
				{
					semester: nextSemester,
					sections: [""],
					subjects: [{ 
						name: "", 
						facultyAssignments: [{ faculty: "", hoursPerWeek: 3 }], 
						weeklyHours: 3, 
						isLab: false 
					}],
				},
			],
		});
	};

	const handleRemoveSemester = (idx: number) => {
		const academics = [...formData.academics];
		academics.splice(idx, 1);
		setFormData({ ...formData, academics });
	};

	const handleAddRoom = () => {
		setFormData({
			...formData,
			rooms: [...formData.rooms, { name: "", isLab: false }],
		});
	};

	const handleRemoveRoom = (idx: number) => {
		if (formData.rooms.length > 1) {
			const rooms = [...formData.rooms];
			rooms.splice(idx, 1);
			setFormData({ ...formData, rooms });
		}
	};

	const handleAddFaculty = () => {
		setFormData({
			...formData,
			faculties: [...formData.faculties, { name: "", empId: "", maxHours: 18 }],
		});
	};

	const handleRemoveFaculty = (idx: number) => {
		if (formData.faculties.length > 1) {
			const faculties = [...formData.faculties];
			faculties.splice(idx, 1);
			setFormData({ ...formData, faculties });
		}
	};

	useEffect(() => {
		checkSetupStatus();
	}, []);

	const checkSetupStatus = async () => {
		try {
			const token = localStorage.getItem("token");
			const response = await axios.get(
				"http://127.0.0.1:8000/timetable/setup/status/",
				{
					headers: { 'Authorization': token ? `Token ${token}` : '' }
				}
			);

			if (response.data.setup_complete) {
				setSetupMode("academic_only");
				setExistingSetup(response.data);
				setFormData({
					...formData,
					institute: response.data.institute || formData.institute,
					rooms: response.data.rooms || formData.rooms,
					faculties: response.data.faculties || formData.faculties
				});
				setStep("step4");
			} else {
				setSetupMode("first_time");
			}
		} catch (error) {
			console.error("Error checking setup status:", error);
		}
	};

	const handleSaveInstituteSetup = async () => {
		try {
			setLoading(true);
			setErrorDetails(null);
			
			// Enhanced validation before sending
			if (!formData.institute.name.trim()) {
				throw new Error("Institution name is required");
			}
			if (!formData.institute.academicYear.trim()) {
				throw new Error("Academic year is required");
			}
			if (!formData.institute.course.trim()) {
				throw new Error("Course is required");
			}
			if (formData.institute.workingDays < 1 || formData.institute.workingDays > 7) {
				throw new Error("Working days must be between 1 and 7");
			}
			if (formData.institute.periodsPerDay < 1 || formData.institute.periodsPerDay > 10) {
				throw new Error("Periods per day must be between 1 and 10");
			}
			
			// Validate faculties
			const validFaculties = formData.faculties.filter(f => 
				f.name.trim() && f.empId.trim() && f.maxHours > 0
			);
			if (validFaculties.length === 0) {
				throw new Error("At least one valid faculty member is required");
			}
			
			// Validate rooms
			const validRooms = formData.rooms.filter(r => r.name.trim());
			if (validRooms.length === 0) {
				throw new Error("At least one valid room is required");
			}
			
			const payload = {
				institute: {
					name: formData.institute.name.trim(),
					academicYear: formData.institute.academicYear.trim(),
					course: formData.institute.course.trim(),
					workingDays: formData.institute.workingDays,
					periodsPerDay: formData.institute.periodsPerDay,
					periodDuration: formData.institute.periodDuration
				},
				rooms: validRooms.map(r => ({
					name: r.name.trim(),
					isLab: r.isLab
				})),
				faculties: validFaculties.map(f => ({
					name: f.name.trim(),
					empId: f.empId.trim(),
					maxHours: f.maxHours
				}))
			};
			
			console.log("Sending institute setup payload:", payload);
			
			const token = localStorage.getItem("token");
			
			// Try different URL formats
			const baseURL = 'http://127.0.0.1:8000'; // or try 'http://localhost:8000'
			
			const response = await axios.post(
				`${baseURL}/timetable/setup/institute/`,
				payload,
				{
					headers: { 
						'Authorization': token ? `Token ${token}` : '',
						'Content-Type': 'application/json'
					},
					timeout: 30000 // 30 second timeout
				}
			);
			
			console.log("Institute setup response:", response.data);
			alert("Institute setup saved successfully! You can now generate timetables with just academic setup.");
			setSetupMode("academic_only");
			setStep("step4");
		} catch (error: any) {
			console.error("Error saving institute setup:", error);
			let errorMsg = "Failed to save institute setup";
			
			if (error.code === 'ERR_NETWORK') {
				errorMsg = "Cannot connect to server. Please check if the backend server is running on http://127.0.0.1:8000";
			} else if (error.response?.data?.error) {
				errorMsg = error.response.data.error;
			} else if (error.message) {
				errorMsg = error.message;
			}
			
			setErrorDetails(errorMsg);
			alert(errorMsg);
		} finally {
			setLoading(false);
		}
	};

	const handleGenerate = async () => {
		try {
			setErrorDetails(null);
			setLoading(true);
			
			// Validate academic data before sending
			if (setupMode === "academic_only") {
				const validationError = validateAcademicData();
				if (validationError) {
					setErrorDetails(validationError);
					alert(validationError);
					return;
				}
			}
			
			const token = localStorage.getItem("token");
			const endpoint = setupMode === "academic_only" 
				? "http://127.0.0.1:8000/timetable/setup/academic/"
				: "http://127.0.0.1:8000/timetable/generate/";
			
			const payload = setupMode === "academic_only" 
				? { academics: formData.academics }
				: formData;

			console.log("Sending payload:", JSON.stringify(payload, null, 2));

			const response = await axios.post(endpoint, payload, {
				headers: {
					'Authorization': token ? `Token ${token}` : '',
					'Content-Type': 'application/json'
				}
			});

			alert("Timetable generated successfully! 🎉");
			navigate(`/timetable/${response.data.section_id || 1}`);
		} catch (error: any) {
			console.error("Generation error:", error);
			let details = "Error generating timetable";
			if (error.response) {
				if (error.response.status === 401) {
					details = "Authentication required. Please login again.";
					localStorage.removeItem("user");
					localStorage.removeItem("token");
					navigate("/login");
					return;
				}
				details += `\nStatus: ${error.response.status}`;
				if (error.response.data?.error) {
					details += `\nMessage: ${error.response.data.error}`;
				} else if (error.response.data?.detail) {
					details += `\nDetail: ${error.response.data.detail}`;
				} else if (typeof error.response.data === 'string') {
					details += `\nMessage: ${error.response.data}`;
				} else {
					details += `\nData: ${JSON.stringify(error.response.data)}`;
				}
			} else if (error.message) {
				details += `\n${error.message}`;
			}
			setErrorDetails(details);
			alert(details);
		} finally {
			setLoading(false);
		}
	};

	const validateAcademicData = (): string | null => {
		if (!formData.academics || formData.academics.length === 0) {
			return "Please add at least one semester";
		}

		for (let i = 0; i < formData.academics.length; i++) {
			const sem = formData.academics[i];
			
			if (!sem.sections || sem.sections.length === 0 || !sem.sections.some(s => s.trim())) {
				return `Semester ${sem.semester}: Please add at least one section`;
			}

			if (!sem.subjects || sem.subjects.length === 0) {
				return `Semester ${sem.semester}: Please add at least one subject`;
			}

			for (let j = 0; j < sem.subjects.length; j++) {
				const subj = sem.subjects[j];
				if (!subj.name || !subj.name.trim()) {
					return `Semester ${sem.semester}: Subject ${j + 1} name is required`;
				}
				
				// Validate faculty assignments
				if (!subj.facultyAssignments || subj.facultyAssignments.length === 0) {
					return `Semester ${sem.semester}: Faculty assignment is required for subject "${subj.name}"`;
				}
				
				// Check if all faculty assignments are valid
				let totalAssignedHours = 0;
				for (const assignment of subj.facultyAssignments) {
					if (!assignment.faculty || !assignment.faculty.trim()) {
						return `Semester ${sem.semester}: Faculty must be selected for subject "${subj.name}"`;
					}
					if (!assignment.hoursPerWeek || assignment.hoursPerWeek < 1) {
						return `Semester ${sem.semester}: Faculty hours must be at least 1 for subject "${subj.name}"`;
					}
					totalAssignedHours += assignment.hoursPerWeek;
				}
				
				// Check if total assigned hours match weekly hours
				if (totalAssignedHours !== subj.weeklyHours) {
					return `Semester ${sem.semester}: Total faculty hours (${totalAssignedHours}) must equal subject weekly hours (${subj.weeklyHours}) for "${subj.name}"`;
				}
			}
		}

		return null;
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex">
			{/* Sidebar */}
			<div className="w-80 bg-white shadow-lg flex flex-col py-8 px-4 animate-fadeInLeft">
				<div className="text-center mb-6">
					<CalendarDays size={40} className="text-blue-600 mx-auto mb-3" />
					<h3 className="text-lg font-bold text-blue-700">
						{setupMode === "academic_only" ? "Academic Setup" : "Setup Wizard"}
					</h3>
					
					{setupMode === "academic_only" && (
						<div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
							<div className="flex items-center gap-2 text-green-700 text-sm font-medium">
								<CheckCircle2 size={16} />
								Institute Setup Complete
							</div>
							<p className="text-green-600 text-xs mt-1">
								Your institution, faculty, and room setup is saved. Only configure academics now.
							</p>
						</div>
					)}
				</div>

				<ul className="space-y-3 flex-1">
					{steps.map((s) => {
						const isVisible = setupMode === "first_time" || s.value === "step4" || s.value === "step5";
						if (!isVisible) return null;
						
						return (
							<li
								key={s.value}
								className={`flex items-center gap-3 font-medium cursor-pointer rounded-lg px-4 py-3 transition-all
									${step === s.value ? "bg-blue-100 text-blue-700 shadow-md border border-blue-200" : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"}`}
								onClick={() => setStep(s.value)}
							>
								{s.icon} 
								<span>{s.label}</span>
								{step === s.value && <div className="w-2 h-2 bg-blue-600 rounded-full ml-auto"></div>}
							</li>
						);
					})}
				</ul>

				{/* Quick Tips */}
				<div className="mt-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
					<h4 className="font-semibold text-indigo-800 mb-2 flex items-center gap-2">
						<Info size={16} />
						Quick Tips
					</h4>
					<ul className="text-xs text-indigo-700 space-y-1">
						<li>• Faculty hour limits are strictly enforced</li>
						<li>• Lab subjects require lab rooms</li>
						<li>• Sessions are distributed across the week</li>
						<li>• Save institute setup once, generate multiple timetables</li>
					</ul>
				</div>
			</div>

			{/* Main Content */}
			<div className="flex-1 px-12 py-8 animate-fadeInRight">
				<Card className="w-full max-w-6xl mx-auto shadow-2xl rounded-2xl bg-white/95 border-2 border-blue-200">
					{/* Header */}
					<div className="p-8 border-b border-gray-200">
						<h2 className="text-3xl font-bold text-center text-blue-800 flex items-center justify-center gap-3">
							<CalendarDays size={32} className="text-blue-500" />
							Smart Timetable Generator
						</h2>
						<p className="text-center text-gray-600 mt-2 text-lg">
							{setupMode === "academic_only" ? 
								"Configure your academic structure and generate optimized timetables" :
								"Complete setup in 5 simple steps to generate intelligent, conflict-free timetables"
							}
						</p>
					</div>

					<div className="p-8">
						<Tabs value={step} onValueChange={setStep}>
							<TabsList className={`grid mb-8 ${setupMode === "academic_only" ? "grid-cols-2" : "grid-cols-5"}`}>
								{steps.map((s) => {
									const isVisible = setupMode === "first_time" || s.value === "step4" || s.value === "step5";
									if (!isVisible) return null;
									return (
										<TabsTrigger key={s.value} value={s.value} className="flex items-center gap-2 py-3">
											{s.icon} {s.label}
										</TabsTrigger>
									);
								})}
							</TabsList>

							{/* Show existing setup info if academic_only mode */}
							{setupMode === "academic_only" && step === "step4" && (
								<div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
									<h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
										<CheckCircle2 size={18} />
										Using Existing Setup
									</h4>
									<div className="grid grid-cols-3 gap-4 text-sm">
										<div>
											<span className="text-gray-600">Institution:</span>
											<p className="font-medium text-blue-700">{existingSetup?.institute?.name}</p>
										</div>
										<div>
											<span className="text-gray-600">Faculty:</span>
											<p className="font-medium text-green-700">{existingSetup?.faculties?.length || 0} members</p>
										</div>
										<div>
											<span className="text-gray-600">Rooms:</span>
											<p className="font-medium text-purple-700">{existingSetup?.rooms?.length || 0} rooms</p>
										</div>
									</div>
								</div>
							)}

							{/* STEP 1 – Institute Setup */}
							<TabsContent value="step1" className="space-y-6">
								<div>
									<h3 className="text-2xl font-semibold text-blue-700 flex items-center gap-3 mb-4">
										<Building2 size={24} />
										Institute Setup
									</h3>
									<p className="text-gray-600 mb-6">
										Configure your institution's basic details and working schedule.
									</p>
								</div>

								<div className="grid gap-6 grid-cols-1 md:grid-cols-2">
									{[
										{ label: "Institution Name", field: "name", placeholder: "Enter your institution name", type: "text" },
										{ label: "Academic Year", field: "academicYear", placeholder: "e.g., 2024-25", type: "text" },
										{ label: "Course", field: "course", placeholder: "e.g., MCA, BE CSE", type: "text" },
										{ label: "Total Semesters", field: "totalSemesters", placeholder: "Total Semesters", type: "number" },
										{ label: "Working Days per Week", field: "workingDays", placeholder: "Working Days", type: "number", min: 1, max: 7 },
										{ label: "Periods per Day", field: "periodsPerDay", placeholder: "Periods per Day", type: "number", min: 1, max: 8 },
										{ label: "Period Duration (minutes)", field: "periodDuration", placeholder: "Duration in minutes", type: "number", min: 30, max: 120 }
									].map((input, idx) => (
										<div key={idx} className="space-y-2">
											<label className="block font-medium text-gray-700">{input.label}</label>
											<input
												type={input.type}
												placeholder={input.placeholder}
												min={input.min}
												max={input.max}
												className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
												value={formData.institute[input.field as keyof typeof formData.institute]}
												onChange={(e) =>
													setFormData({
														...formData,
														institute: {
															...formData.institute,
															[input.field]: input.type === "number" ? Number(e.target.value) : e.target.value,
														},
													})
												}
											/>
										</div>
									))}
								</div>

								<div className="flex justify-end pt-6">
									<Button
										onClick={() => setStep("step2")}
										className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-3 text-lg"
									>
										Next: Infrastructure
									</Button>
								</div>
							</TabsContent>

							{/* STEP 2 – Infrastructure */}
							<TabsContent value="step2" className="space-y-6">
								<div>
									<h3 className="text-2xl font-semibold text-purple-700 flex items-center gap-3 mb-4">
										<BookOpen size={24} />
										Infrastructure Setup
									</h3>
									<p className="text-gray-600 mb-6">
										Add classrooms and laboratories available for scheduling.
									</p>
								</div>

								<div className="space-y-4">
									{formData.rooms.map((room, idx) => (
										<div key={idx} className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
											<div className="flex-1">
												<input
													placeholder={`Room name (e.g., Room ${100 + idx}, Lab ${idx + 1})`}
													className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
													value={room.name}
													onChange={(e) => {
														const rooms = [...formData.rooms];
														rooms[idx].name = e.target.value;
														setFormData({ ...formData, rooms });
													}}
												/>
											</div>
											<div className="flex items-center gap-2">
												<input
													type="checkbox"
													id={`lab-${idx}`}
													className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
													checked={room.isLab}
													onChange={(e) => {
														const rooms = [...formData.rooms];
														rooms[idx].isLab = e.target.checked;
														setFormData({ ...formData, rooms });
													}}
												/>
												<label htmlFor={`lab-${idx}`} className="font-medium text-gray-700">Laboratory</label>
											</div>
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleRemoveRoom(idx)}
												disabled={formData.rooms.length <= 1}
												className="text-red-600 border-red-300 hover:bg-red-50"
											>
												<Trash2 size={16} />
											</Button>
										</div>
									))}
								</div>

								<Button
									variant="outline"
									onClick={handleAddRoom}
									className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
								>
									<Plus size={18} className="mr-2" />
									Add Room
								</Button>

								<div className="flex justify-between pt-6">
									<Button variant="secondary" onClick={() => setStep("step1")}>
										Back
									</Button>
									<Button
										onClick={() => setStep("step3")}
										className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-8"
									>
										Next: Faculty
									</Button>
								</div>
							</TabsContent>

							{/* STEP 3 – Faculty */}
							<TabsContent value="step3" className="space-y-6">
								<div>
									<h3 className="text-2xl font-semibold text-green-700 flex items-center gap-3 mb-4">
										<Users size={24} />
										Faculty Setup
									</h3>
									<p className="text-gray-600 mb-6">
										Add faculty members and set their weekly teaching hour limits.
									</p>
									<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
										<div className="flex items-start gap-3">
											<AlertCircle size={20} className="text-yellow-600 mt-0.5" />
											<div>
												<h4 className="font-medium text-yellow-800">Important: Faculty Hour Limits</h4>
												<p className="text-yellow-700 text-sm">
													The system will strictly enforce these hour limits. If a faculty member has 10 hours/week, 
													they will be assigned exactly that many periods across all subjects and sections.
												</p>
											</div>
										</div>
									</div>
								</div>

								<div className="space-y-4">
									{formData.faculties.map((faculty, idx) => (
										<div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1">Faculty Name</label>
												<input
													placeholder="Full name"
													className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
													value={faculty.name}
													onChange={(e) => {
														const faculties = [...formData.faculties];
														faculties[idx].name = e.target.value;
														setFormData({ ...formData, faculties });
													}}
												/>
											</div>
											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
												<input
													placeholder="Employee ID"
													className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
													value={faculty.empId}
													onChange={(e) => {
														const faculties = [...formData.faculties];
														faculties[idx].empId = e.target.value;
														setFormData({ ...formData, faculties });
													}}
												/>
											</div>
											<div className="flex items-end gap-2">
												<div className="flex-1">
													<label className="block text-sm font-medium text-gray-700 mb-1">Max Periods/Week</label>
													<input
														type="number"
														placeholder="18"
														min="1"
														max="30"
														className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
														value={faculty.maxHours}
														onChange={(e) => {
															const faculties = [...formData.faculties];
															faculties[idx].maxHours = Number(e.target.value);
															setFormData({ ...formData, faculties });
														}}
													/>
												</div>
												<Button
													variant="outline"
													size="sm"
													onClick={() => handleRemoveFaculty(idx)}
													disabled={formData.faculties.length <= 1}
													className="text-red-600 border-red-300 hover:bg-red-50 p-3"
												>
													<Trash2 size={16} />
												</Button>
											</div>
										</div>
									))}
								</div>

								<Button
									variant="outline"
									onClick={handleAddFaculty}
									className="w-full border-green-300 text-green-700 hover:bg-green-50"
								>
									<Plus size={18} className="mr-2" />
									Add Faculty Member
								</Button>

								{setupMode === "first_time" && (
									<div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
										<h4 className="font-semibold text-blue-800 mb-2">Complete Institute Setup</h4>
										<p className="text-blue-700 text-sm mb-4">
											Save your institution, room, and faculty setup. You'll only need to do this once!
										</p>
										<Button
											onClick={handleSaveInstituteSetup}
											disabled={loading}
											className="bg-gradient-to-r from-blue-500 to-green-500 text-white"
										>
											{loading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
											Save Institute Setup
										</Button>
									</div>
								)}

								<div className="flex justify-between pt-6">
									<Button variant="secondary" onClick={() => setStep("step2")}>
										Back
									</Button>
									<Button
										onClick={() => setStep("step4")}
										className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-8"
									>
										Next: Academic
									</Button>
								</div>
							</TabsContent>

							{/* STEP 4 – Academic Setup */}
							<TabsContent value="step4" className="space-y-6">
								<div>
									<h3 className="text-2xl font-semibold text-pink-700 flex items-center gap-3 mb-4">
										<Home size={24} />
										Academic Structure
									</h3>
									<p className="text-gray-600 mb-6">
										Configure your academic structure with semesters, sections, and subjects.
									</p>
									<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
										<h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
											<BookOpen size={18} />
											Subject Configuration Guide
										</h4>
										<ul className="text-blue-700 text-sm space-y-1">
											<li>• <strong>Theory Subjects:</strong> Regular classroom subjects (3-5 classes per week typical)</li>
											<li>• <strong>Lab Subjects:</strong> Practical subjects requiring lab rooms (2-3 classes per week typical)</li>
											<li>• <strong>Classes per Week:</strong> Total number of periods allocated for each subject</li>
											<li>• <strong>Faculty Hours:</strong> System will validate against faculty weekly hour limits</li>
										</ul>
									</div>
								</div>

								<div className="flex gap-4 mb-4">
									<Button
										variant="outline"
										className="bg-pink-100 text-pink-700"
										onClick={handleAddSemester}
									>
										+ Add Semester
									</Button>
									{formData.academics.length > 1 && (
										<Button
											variant="outline"
											className="bg-red-100 text-red-700"
											onClick={() => handleRemoveSemester(formData.academics.length - 1)}
										>
											Remove Last Semester
										</Button>
									)}
								</div>

								{formData.academics.map((sem, semIdx) => (
									<div key={semIdx} className="border-2 border-pink-200 p-6 rounded-lg mb-6 bg-pink-50">
										<div className="flex justify-between items-center mb-4">
											<h4 className="font-semibold text-pink-700 text-lg">Semester {sem.semester}</h4>
											{formData.academics.length > 1 && (
												<Button
													variant="outline"
													className="text-red-500 border-red-300 hover:bg-red-50"
													size="sm"
													onClick={() => handleRemoveSemester(semIdx)}
												>
													<Trash2 size={16} className="mr-1" />
													Remove Semester
												</Button>
											)}
										</div>

										{/* Sections */}
										<div className="mb-6">
											<label className="block mb-3 font-semibold text-gray-700 flex items-center gap-2">
												<Users size={18} />
												Sections
											</label>
											<div className="space-y-2">
												{sem.sections.map((section, secIdx) => (
													<div key={secIdx} className="flex gap-2">
														<input
															placeholder={`Section ${String.fromCharCode(65 + secIdx)} (e.g., A, B, C)`}
															className="flex-1 border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-pink-500"
															value={section}
															onChange={(e) => {
																const academics = [...formData.academics];
																academics[semIdx].sections[secIdx] = e.target.value;
																setFormData({ ...formData, academics });
															}}
														/>
														{sem.sections.length > 1 && (
															<Button
																variant="outline"
																size="sm"
																onClick={() => {
																	const academics = [...formData.academics];
																	academics[semIdx].sections.splice(secIdx, 1);
																	setFormData({ ...formData, academics });
																}}
																className="text-red-600 border-red-300"
															>
																<Trash2 size={16} />
															</Button>
														)}
													</div>
												))}
											</div>
											<Button
												variant="outline"
												className="mt-2 border-pink-300 text-pink-700 hover:bg-pink-50"
												onClick={() => {
													const academics = [...formData.academics];
													academics[semIdx].sections.push("");
													setFormData({ ...formData, academics });
												}}
											>
												<Plus size={16} className="mr-2" />
												Add Section
											</Button>
										</div>

										{/* Subjects */}
										<div>
											<label className="block mb-3 font-semibold text-gray-700 flex items-center gap-2">
												<BookOpen size={18} />
												Subjects & Faculty Assignment
											</label>
											<div className="space-y-4">
												{sem.subjects.map((subj, subjIdx) => (
													<div key={subjIdx} className="p-4 bg-white rounded-lg border-2 border-gray-200">
														{/* Subject Header */}
														<div className="grid grid-cols-1 md:grid-cols-8 gap-3 mb-4">
															{/* Subject Name */}
															<div className="md:col-span-3">
																<label className="block text-xs font-medium text-gray-600 mb-1">Subject Name</label>
																<input
																	placeholder="e.g., Operating Systems, Database Lab"
																	className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-pink-500"
																	value={subj.name}
																	onChange={(e) => {
																		const academics = [...formData.academics];
																		academics[semIdx].subjects[subjIdx].name = e.target.value;
																		setFormData({ ...formData, academics });
																	}}
																/>
															</div>

															{/* Total Weekly Hours */}
															<div className="md:col-span-2">
																<label className="block text-xs font-medium text-gray-600 mb-1">Total Classes/Week</label>
																<input
																	type="number"
																	min="1"
																	max="10"
																	placeholder="6"
																	className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-pink-500"
																	value={subj.weeklyHours}
																	onChange={(e) => {
																		const academics = [...formData.academics];
																		const newWeeklyHours = parseInt(e.target.value) || 1;
																		academics[semIdx].subjects[subjIdx].weeklyHours = newWeeklyHours;
																		
																		// Auto-adjust first faculty assignment if it exceeds total hours
																		if (academics[semIdx].subjects[subjIdx].facultyAssignments.length > 0) {
																			const currentFirstAssignment = academics[semIdx].subjects[subjIdx].facultyAssignments[0].hoursPerWeek;
																			if (currentFirstAssignment > newWeeklyHours) {
																				academics[semIdx].subjects[subjIdx].facultyAssignments[0].hoursPerWeek = newWeeklyHours;
																			}
																		}
																		
																		setFormData({ ...formData, academics });
																	}}
																/>
															</div>

															{/* Lab/Theory Toggle */}
															<div className="md:col-span-2">
																<label className="block text-xs font-medium text-gray-600 mb-1">Subject Type</label>
																<div className="flex items-center gap-2 p-2">
																	<input
																		type="checkbox"
																		id={`lab-${semIdx}-${subjIdx}`}
																		className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
																		checked={subj.isLab}
																		onChange={(e) => {
																			const academics = [...formData.academics];
																			academics[semIdx].subjects[subjIdx].isLab = e.target.checked;
																			setFormData({ ...formData, academics });
																		}}
																	/>
																	<label 
																		htmlFor={`lab-${semIdx}-${subjIdx}`} 
																		className={`text-sm font-medium ${subj.isLab ? 'text-purple-700' : 'text-gray-600'}`}
																	>
																		{subj.isLab ? '🔬 Lab' : '📚 Theory'}
																	</label>
																</div>
															</div>

															{/* Actions */}
															<div className="md:col-span-1 flex items-end">
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => {
																		const academics = [...formData.academics];
																		academics[semIdx].subjects.splice(subjIdx, 1);
																		setFormData({ ...formData, academics });
																	}}
																	disabled={sem.subjects.length <= 1}
																	className="text-red-600 border-red-300 hover:bg-red-50 w-full"
																>
																	<Trash2 size={16} />
																</Button>
															</div>
														</div>

														{/* Faculty Assignments */}
														<div className="border-t border-gray-200 pt-4">
															<div className="flex items-center justify-between mb-3">
																<h6 className="font-medium text-gray-700 flex items-center gap-2">
																	<Users size={16} />
																	Faculty Assignments
																	<span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
																		{subj.facultyAssignments.reduce((sum, fa) => sum + (fa.hoursPerWeek || 0), 0)}/{subj.weeklyHours} hours assigned
																	</span>
																</h6>
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => {
																		const academics = [...formData.academics];
																		const remainingHours = subj.weeklyHours - subj.facultyAssignments.reduce((sum, fa) => sum + (fa.hoursPerWeek || 0), 0);
																		academics[semIdx].subjects[subjIdx].facultyAssignments.push({
																			faculty: "",
																			hoursPerWeek: Math.max(1, remainingHours)
																		});
																		setFormData({ ...formData, academics });
																	}}
																	className="text-green-600 border-green-300 hover:bg-green-50"
																>
																	<Plus size={14} className="mr-1" />
																	Add Faculty
																</Button>
															</div>

															<div className="space-y-3">
																{subj.facultyAssignments.map((assignment, assignIdx) => {
																	const totalAssignedHours = subj.facultyAssignments.reduce((sum, fa, idx) => 
																		idx !== assignIdx ? sum + (fa.hoursPerWeek || 0) : sum, 0
																	);
																	const maxHoursForThis = subj.weeklyHours - totalAssignedHours;

																	return (
																		<div key={assignIdx} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 bg-gray-50 rounded border">
																			{/* Faculty Selection */}
																			<div className="md:col-span-2">
																				<label className="block text-xs font-medium text-gray-600 mb-1">Faculty</label>
																				<select
																					className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-pink-500"
																					value={assignment.faculty}
																					onChange={(e) => {
																						const academics = [...formData.academics];
																						academics[semIdx].subjects[subjIdx].facultyAssignments[assignIdx].faculty = e.target.value;
																						setFormData({ ...formData, academics });
																					}}
																				>
																					<option value="">Select Faculty</option>
																					{formData.faculties.map((f, i) => (
																						<option key={i} value={f.name}>
																							{f.name} ({f.maxHours}h/week available)
																						</option>
																					))}
																				</select>
																			</div>

																			{/* Hours Assignment */}
																			<div className="md:col-span-2">
																				<label className="block text-xs font-medium text-gray-600 mb-1">
																					Hours/Week (max: {maxHoursForThis})
																				</label>
																				<input
																					type="number"
																					min="1"
																					max={maxHoursForThis}
																					className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-pink-500"
																					value={assignment.hoursPerWeek}
																					onChange={(e) => {
																						const academics = [...formData.academics];
																						const newHours = Math.min(
																							parseInt(e.target.value) || 1,
																							maxHoursForThis
																						);
																						academics[semIdx].subjects[subjIdx].facultyAssignments[assignIdx].hoursPerWeek = newHours;
																						setFormData({ ...formData, academics });
																					}}
																				/>
																			</div>

																			{/* Remove Assignment */}
																			<div className="md:col-span-1 flex items-end">
																				<Button
																					variant="outline"
																					size="sm"
																					onClick={() => {
																						const academics = [...formData.academics];
																						academics[semIdx].subjects[subjIdx].facultyAssignments.splice(assignIdx, 1);
																						setFormData({ ...formData, academics });
																					}}
																					disabled={subj.facultyAssignments.length <= 1}
																					className="text-red-600 border-red-300 hover:bg-red-50 w-full"
																				>
																					<Trash2 size={14} />
																				</Button>
																			</div>
																		</div>
																	);
																})}
															</div>

															{/* Assignment Validation */}
															{(() => {
																const totalAssigned = subj.facultyAssignments.reduce((sum, fa) => sum + (fa.hoursPerWeek || 0), 0);
																const isUnderAssigned = totalAssigned < subj.weeklyHours;
																const isOverAssigned = totalAssigned > subj.weeklyHours;

																return (
																	<div className="mt-3">
																		{isOverAssigned && (
																			<div className="flex items-center gap-2 text-red-600 text-sm">
																				<AlertCircle size={16} />
																				Over-assigned by {totalAssigned - subj.weeklyHours} hours
																			</div>
																		)}
																		{isUnderAssigned && (
																			<div className="flex items-center gap-2 text-orange-600 text-sm">
																				<AlertCircle size={16} />
																				Under-assigned by {subj.weeklyHours - totalAssigned} hours
																			</div>
																		)}
																		{!isOverAssigned && !isUnderAssigned && totalAssigned > 0 && (
																			<div className="flex items-center gap-2 text-green-600 text-sm">
																				<CheckCircle2 size={16} />
																				Perfectly assigned ({totalAssigned} hours)
																			</div>
																		)}
																	</div>
																);
															})()}
														</div>

														{/* Lab Subject Info */}
														{subj.isLab && (
															<div className="mt-4 p-3 bg-purple-50 rounded border border-purple-200">
																<p className="text-xs text-purple-700">
																	🔬 <strong>Lab Subject:</strong> Will be scheduled in lab rooms. 
																	Multiple faculty can handle different lab batches or theory+lab portions.
																</p>
															</div>
														)}
													</div>
												))}
											</div>

											<Button
												variant="outline"
												className="mt-3 border-pink-300 text-pink-700 hover:bg-pink-50"
												onClick={() => {
													const academics = [...formData.academics];
													academics[semIdx].subjects.push({ 
														name: "", 
														facultyAssignments: [{ faculty: "", hoursPerWeek: 3 }],
														weeklyHours: 3, 
														isLab: false 
													});
													setFormData({ ...formData, academics });
												}}
											>
												<Plus size={16} className="mr-2" />
												Add Subject
											</Button>
										</div>

										{/* Semester Summary */}
										<div className="mt-4 p-3 bg-gray-50 rounded-lg">
											<h5 className="font-medium text-gray-800 mb-2">Semester Summary</h5>
											<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
												<div>
													<span className="text-gray-600">Sections:</span>
													<p className="font-medium">{sem.sections.filter(s => s.trim()).length}</p>
												</div>
												<div>
													<span className="text-gray-600">Theory Subjects:</span>
													<p className="font-medium">{sem.subjects.filter(s => !s.isLab).length}</p>
												</div>
												<div>
													<span className="text-gray-600">Lab Subjects:</span>
													<p className="font-medium">{sem.subjects.filter(s => s.isLab).length}</p>
												</div>
												<div>
													<span className="text-gray-600">Total Classes/Week:</span>
													<p className="font-medium">{sem.subjects.reduce((sum, s) => sum + (s.weeklyHours || 0), 0)} × {sem.sections.filter(s => s.trim()).length} sections</p>
												</div>
											</div>
										</div>
									</div>
								))}

								{/* Faculty Hours Validation */}
								<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
									<h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
										<AlertCircle size={18} />
										Faculty Workload Analysis
									</h4>
									<div className="space-y-2">
										{formData.faculties.map((faculty, idx) => {
											const assignedHours = formData.academics.reduce((total, sem) => {
												const sectionsCount = sem.sections.filter(s => s.trim()).length;
												return total + sem.subjects.reduce((subTotal, subj) => {
													const facultyAssignment = subj.facultyAssignments.find(fa => fa.faculty === faculty.name);
													return subTotal + (facultyAssignment ? (facultyAssignment.hoursPerWeek || 0) * sectionsCount : 0);
												}, 0);
											}, 0);
											const isOverloaded = assignedHours > faculty.maxHours;
											const utilizationRate = faculty.maxHours > 0 ? (assignedHours / faculty.maxHours) * 100 : 0;

											return (
												<div key={idx} className={`flex items-center justify-between p-3 rounded ${
													isOverloaded ? 'bg-red-100 text-red-800 border border-red-300' : 
													utilizationRate > 80 ? 'bg-orange-100 text-orange-800 border border-orange-300' : 
													'bg-green-100 text-green-800 border border-green-300'
												}`}>
													<div>
														<span className="font-medium">{faculty.name}</span>
														<div className="text-xs opacity-75">
															Subjects: {formData.academics.reduce((count, sem) => 
																count + sem.subjects.filter(subj => 
																	subj.facultyAssignments.some(fa => fa.faculty === faculty.name)
																).length, 0
															)}
														</div>
													</div>
													<div className="text-right">
														<div className="text-sm">
															{assignedHours}/{faculty.maxHours} hours 
															({utilizationRate.toFixed(1)}%)
														</div>
														{isOverloaded && (
															<div className="text-xs font-bold">⚠️ OVERLOADED by {assignedHours - faculty.maxHours}h</div>
														)}
													</div>
												</div>
											);
										})}
									</div>
									
									{/* Smart Suggestions */}
									<div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
										<h5 className="font-medium text-blue-800 mb-2">💡 Smart Load Balancing Tips:</h5>
										<ul className="text-blue-700 text-sm space-y-1">
											<li>• Assign multiple faculty to high-hour subjects (6+ hours/week)</li>
											<li>• Balance theory and lab portions among different faculty</li>
											<li>• Use senior faculty for advanced topics, junior for basics</li>
											<li>• Consider faculty expertise when distributing hours</li>
										</ul>
									</div>
								</div>

								<div className="mt-8 flex justify-between">
									<Button
										variant="secondary"
										onClick={() => setStep(setupMode === "academic_only" ? "step5" : "step3")}
									>
										Back
									</Button>
									<Button
										className="bg-gradient-to-r from-pink-500 to-blue-500 text-white shadow"
										onClick={() => setStep("step5")}
									>
										Next: Review
									</Button>
								</div>
							</TabsContent>

							{/* STEP 5 – Review & Generate */}
							<TabsContent value="step5" className="space-y-6">
								<h3 className="text-xl font-semibold mb-2 text-indigo-700 flex items-center gap-2">
									<CheckCircle2 size={22} /> Review & Generate
								</h3>
								<p className="text-sm text-gray-500 mb-6">
									Review your inputs below. Please verify faculty assignments and hour distributions before generating the timetable.
								</p>
								<div className="grid gap-8">
									{/* Institute Info */}
									{setupMode === "first_time" && (
										<>
											<div className="bg-blue-50 rounded-lg p-4">
												<h4 className="font-semibold text-blue-700 mb-2">Institute Info</h4>
												<div className="grid grid-cols-2 gap-4 text-sm">
													<div><span className="font-medium">Name:</span> {formData.institute.name}</div>
													<div><span className="font-medium">Academic Year:</span> {formData.institute.academicYear}</div>
													<div><span className="font-medium">Course:</span> {formData.institute.course}</div>
													<div><span className="font-medium">Total Semesters:</span> {formData.institute.totalSemesters}</div>
													<div><span className="font-medium">Working Days:</span> {formData.institute.workingDays}</div>
													<div><span className="font-medium">Periods/Day:</span> {formData.institute.periodsPerDay}</div>
												</div>
											</div>

											{/* Rooms Info */}
											<div className="bg-purple-50 rounded-lg p-4">
												<h4 className="font-semibold text-purple-700 mb-2">Rooms & Labs</h4>
												<div className="grid grid-cols-2 gap-2 text-sm">
													{formData.rooms.map((room, idx) => (
														<div key={idx} className="flex items-center gap-2">
															<span>{room.isLab ? '🔬' : '🏫'}</span>
															<span>{room.name} ({room.isLab ? 'Lab' : 'Classroom'})</span>
														</div>
													))}
												</div>
											</div>

											{/* Faculty Info */}
											<div className="bg-green-50 rounded-lg p-4">
												<h4 className="font-semibold text-green-700 mb-2">Faculty</h4>
												<div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
													{formData.faculties.map((faculty, idx) => (
														<div key={idx} className="flex items-center justify-between p-2 bg-white rounded">
															<span>{faculty.name} ({faculty.empId})</span>
															<span className="font-medium">{faculty.maxHours} hrs/week</span>
														</div>
													))}
												</div>
											</div>
										</>
									)}

									{/* Academic Info */}
									<div className="bg-pink-50 rounded-lg p-4">
										<h4 className="font-semibold text-pink-700 mb-2">Academic Setup</h4>
										{formData.academics.map((sem, semIdx) => (
											<div key={semIdx} className="mb-6 p-4 bg-white rounded border">
												<div className="font-medium text-pink-700 mb-3 text-lg">Semester {sem.semester}</div>
												
												{/* Sections */}
												<div className="mb-4">
													<span className="font-medium text-gray-700">Sections:</span> 
													<span className="ml-2">{sem.sections.filter(s => s.trim()).join(", ")}</span>
												</div>

												{/* Subjects Table */}
												<div className="overflow-x-auto">
													<table className="w-full text-sm border border-gray-200 rounded">
														<thead className="bg-gray-100">
															<tr>
																<th className="p-2 border text-left">Subject</th>
																<th className="p-2 border text-left">Faculty Assignments</th>
																<th className="p-2 border text-center">Type</th>
																<th className="p-2 border text-center">Total Hours</th>
																<th className="p-2 border text-center">Per Section</th>
															</tr>
														</thead>
														<tbody>
															{sem.subjects.map((subj, subjIdx) => {
																const sectionsCount = sem.sections.filter(s => s.trim()).length;
																
																return (
																	<tr key={subjIdx}>
																		<td className="p-2 border font-medium">{subj.name}</td>
																		<td className="p-2 border">
																			<div className="space-y-1">
																				{subj.facultyAssignments.map((assignment, idx) => (
																					<div key={idx} className="text-xs">
																						<span className="font-medium text-blue-700">{assignment.faculty}</span>
																						<span className="text-gray-600 ml-1">({assignment.hoursPerWeek}h)</span>
																					</div>
																				))}
																			</div>
																		</td>
																		<td className="p-2 border text-center">
																			{subj.isLab ? '🔬 Lab' : '📚 Theory'}
																		</td>
																		<td className="p-2 border text-center font-medium">
																			{subj.weeklyHours} hours
																		</td>
																		<td className="p-2 border text-center font-medium">
																			{subj.weeklyHours * sectionsCount} 
																			<span className="text-xs text-gray-500 block">
																				({sectionsCount} sections)
																			</span>
																		</td>
																	</tr>
																);
															})}
														</tbody>
													</table>
												</div>
											</div>
										))}
									</div>

									{/* Final Summary */}
									<div className="bg-indigo-50 rounded-lg p-4">
										<h4 className="font-semibold text-indigo-700 mb-2">Generation Summary</h4>
										<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
											<div>
												<span className="text-gray-600">Total Semesters:</span>
												<p className="font-bold text-indigo-800">{formData.academics.length}</p>
											</div>
											<div>
												<span className="text-gray-600">Total Sections:</span>
												<p className="font-bold text-indigo-800">
													{formData.academics.reduce((sum, sem) => sum + sem.sections.filter(s => s.trim()).length, 0)}
												</p>
											</div>
											<div>
												<span className="text-gray-600">Theory Subjects:</span>
												<p className="font-bold text-indigo-800">
													{formData.academics.reduce((sum, sem) => sum + sem.subjects.filter(s => !s.isLab).length, 0)}
												</p>
											</div>
											<div>
												<span className="text-gray-600">Lab Subjects:</span>
												<p className="font-bold text-indigo-800">
													{formData.academics.reduce((sum, sem) => sum + sem.subjects.filter(s => s.isLab).length, 0)}
												</p>
											</div>
										</div>
									</div>
								</div>

								<Button
									className="mt-8 w-full bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow flex items-center justify-center gap-2"
									onClick={handleGenerate}
									disabled={loading}
								>
									{loading && <Loader2 className="animate-spin" size={20} />}
									{loading ? "Generating..." : "Generate Timetable"}
								</Button>
								{loading && (
									<div className="mt-4 flex justify-center">
										<Loader2 className="animate-spin text-indigo-500" size={32} />
										<span className="ml-2 text-indigo-700 font-medium">Generating timetable, please wait...</span>
									</div>
								)}
								{errorDetails && (
									<div className="mt-4 p-3 bg-red-50 border border-red-300 rounded text-red-700 text-sm whitespace-pre-wrap">
										<strong>Error Details:</strong>
										<br />
										{errorDetails}
									</div>
								)}
								<Button
									variant="secondary"
									className="mt-2"
									onClick={() => setStep("step4")}
									disabled={loading}
								>
									Back
								</Button>
							</TabsContent>
						</Tabs>
					</div>
				</Card>
			</div>
		</div>
	);
}