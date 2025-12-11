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
				subjects: [{ name: "", faculty: "", weeklyHours: 3, isLab: false, labHours: 0 }],
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
					subjects: [{ name: "", faculty: "", weeklyHours: 3, isLab: false, labHours: 0 }],
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
			const token = localStorage.getItem("token");
			await axios.post(
				"http://127.0.0.1:8000/timetable/setup/institute/",
				{
					institute: formData.institute,
					rooms: formData.rooms,
					faculties: formData.faculties
				},
				{
					headers: { 'Authorization': token ? `Token ${token}` : '' }
				}
			);
			alert("Institute setup saved successfully! You can now generate timetables with just academic setup.");
			setSetupMode("academic_only");
			setStep("step4");
		} catch (error: any) {
			console.error("Error saving institute setup:", error);
			alert("Failed to save institute setup: " + (error.response?.data?.error || error.message));
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
				if (!subj.faculty || !subj.faculty.trim()) {
					return `Semester ${sem.semester}: Faculty assignment is required for subject "${subj.name}"`;
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
									<div key={semIdx} className="border p-3 rounded mb-4 bg-pink-50">
										<div className="flex justify-between items-center mb-2">
											<h4 className="font-medium text-pink-700">Semester {sem.semester}</h4>
											{formData.academics.length > 1 && (
												<Button
													variant="ghost"
													className="text-red-500"
													size="sm"
													onClick={() => handleRemoveSemester(semIdx)}
												>
													Remove
												</Button>
											)}
										</div>
										<label className="block mb-1 font-medium text-gray-700">Sections</label>
										{sem.sections.map((section, secIdx) => (
											<input
												key={secIdx}
												placeholder={`Section Name ${secIdx + 1}`}
												className="border p-2 rounded w-full mb-2"
												value={section}
												onChange={(e) => {
													const academics = [...formData.academics];
													academics[semIdx].sections[secIdx] = e.target.value;
													setFormData({ ...formData, academics });
												}}
											/>
										))}
										<Button
											variant="outline"
											className="mt-2"
											onClick={() => {
												const academics = [...formData.academics];
												academics[semIdx].sections.push("");
												setFormData({ ...formData, academics });
											}}
										>
											+ Add Section
										</Button>
										<label className="block mt-4 mb-1 font-medium text-gray-700">Subjects</label>
										{sem.subjects.map((subj, subjIdx) => (
											<div key={subjIdx} className="flex gap-2 mt-2">
												<input
													placeholder="Subject Name"
													className="border p-2 rounded w-full"
													value={subj.name}
													onChange={(e) => {
														const academics = [...formData.academics];
														academics[semIdx].subjects[subjIdx].name = e.target.value;
														setFormData({ ...formData, academics });
													}}
												/>
												<select
													className="border p-2 rounded"
													value={subj.faculty}
													onChange={(e) => {
														const academics = [...formData.academics];
														academics[semIdx].subjects[subjIdx].faculty = e.target.value;
														setFormData({ ...formData, academics });
													}}
												>
													<option value="">Select Faculty</option>
													{formData.faculties.map((f, i) => (
														<option key={i} value={f.name}>
															{f.name}
														</option>
													))}
												</select>
											</div>
										))}
										<Button
											variant="outline"
											className="mt-2"
											onClick={() => {
												const academics = [...formData.academics];
												academics[semIdx].subjects.push({ name: "", faculty: "" });
												setFormData({ ...formData, academics });
											}}
										>
											+ Add Subject
										</Button>
									</div>
								))}
								<div className="mt-8 flex justify-between">
									<Button
										variant="secondary"
										onClick={() => setStep("step3")}
									>
										Back
									</Button>
									<Button
										className="bg-gradient-to-r from-pink-500 to-blue-500 text-white shadow"
										onClick={() => setStep("step5")}
									>
										Next
									</Button>
								</div>
							</TabsContent>

							{/* STEP 5 – Review & Generate */}
							<TabsContent value="step5" className="space-y-6">
								<h3 className="text-xl font-semibold mb-2 text-indigo-700 flex items-center gap-2">
									<CheckCircle2 size={22} /> Review & Generate
								</h3>
								<p className="text-sm text-gray-500 mb-6">
									Review your inputs below. Please verify before generating the timetable.
								</p>
								<div className="grid gap-8">
									{/* Institute Info */}
									<div className="bg-blue-50 rounded-lg p-4">
										<h4 className="font-semibold text-blue-700 mb-2">Institute Info</h4>
										<table className="w-full text-sm">
											<tbody>
												<tr>
													<td className="font-medium">Name</td>
													<td>{formData.institute.name}</td>
												</tr>
												<tr>
													<td className="font-medium">Academic Year</td>
													<td>{formData.institute.academicYear}</td>
												</tr>
												<tr>
													<td className="font-medium">Course</td>
													<td>{formData.institute.course}</td>
												</tr>
												<tr>
													<td className="font-medium">Total Semesters</td>
													<td>{formData.institute.totalSemesters}</td>
												</tr>
												<tr>
													<td className="font-medium">Working Days</td>
													<td>{formData.institute.workingDays}</td>
												</tr>
												<tr>
													<td className="font-medium">Periods/Day</td>
													<td>{formData.institute.periodsPerDay}</td>
												</tr>
												<tr>
													<td className="font-medium">Period Duration</td>
													<td>{formData.institute.periodDuration} mins</td>
												</tr>
											</tbody>
										</table>
									</div>
									{/* Rooms Info */}
									<div className="bg-purple-50 rounded-lg p-4">
										<h4 className="font-semibold text-purple-700 mb-2">Rooms & Labs</h4>
										<table className="w-full text-sm">
											<thead>
												<tr>
													<th>Name</th>
													<th>Lab?</th>
												</tr>
											</thead>
											<tbody>
												{formData.rooms.map((room, idx) => (
													<tr key={idx}>
														<td>{room.name}</td>
														<td>{room.isLab ? "Yes" : "No"}</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
									{/* Faculty Info */}
									<div className="bg-green-50 rounded-lg p-4">
										<h4 className="font-semibold text-green-700 mb-2">Faculty</h4>
										<table className="w-full text-sm">
											<thead>
												<tr>
													<th>Name</th>
													<th>Employee ID</th>
												</tr>
											</thead>
											<tbody>
												{formData.faculties.map((faculty, idx) => (
													<tr key={idx}>
														<td>{faculty.name}</td>
														<td>{faculty.empId}</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
									{/* Academic Info */}
									<div className="bg-pink-50 rounded-lg p-4">
										<h4 className="font-semibold text-pink-700 mb-2">Academic Setup</h4>
										{formData.academics.map((sem, semIdx) => (
											<div key={semIdx} className="mb-4">
												<div className="font-medium text-pink-700 mb-1">Semester {sem.semester}</div>
												<div className="mb-2">
													<span className="font-medium">Sections:</span> {sem.sections.join(", ")}
												</div>
												<table className="w-full text-sm">
													<thead>
														<tr>
															<th>Subject</th>
															<th>Faculty</th>
														</tr>
													</thead>
													<tbody>
														{sem.subjects.map((subj, subjIdx) => (
															<tr key={subjIdx}>
																<td>{subj.name}</td>
																<td>{subj.faculty}</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
										))}
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