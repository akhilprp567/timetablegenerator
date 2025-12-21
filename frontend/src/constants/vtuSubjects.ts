export const VTU_SUBJECTS: Record<string, string[]> = {
  // MCA variations
  "MCA": [
    "Advanced Data Structures",
    "Database Management Systems",
    "Web Technologies",
    "Software Engineering",
    "Operating Systems",
    "Computer Networks",
    "Design Patterns",
    "Advanced Algorithms",
    "Cloud Computing",
    "Machine Learning",
    "Artificial Intelligence",
    "Data Science",
    "Cybersecurity",
    "Mobile Computing",
    "Big Data Analytics",
    "IoT Systems",
    "Compiler Design",
    "Distributed Computing",
  ],

  // BE CSE variations
  "BE CSE": [
    "Data Structures",
    "Database Management",
    "Web Development",
    "Software Engineering",
    "Operating Systems",
    "Computer Networks",
    "Object-Oriented Programming",
    "Java Programming",
    "Python Programming",
    "C Programming",
    "Algorithms",
    "Digital Logic Design",
    "Microprocessors",
    "System Software",
    "Embedded Systems",
    "Computer Architecture",
    "Introduction to AI",
    "Mobile App Development",
    "Cryptography",
    "Discrete Mathematics",
  ],

  "BE(CSE)": [
    "Data Structures",
    "Database Management",
    "Web Development",
    "Software Engineering",
    "Operating Systems",
    "Computer Networks",
    "Object-Oriented Programming",
    "Java Programming",
    "Python Programming",
    "C Programming",
    "Algorithms",
    "Digital Logic Design",
    "Microprocessors",
    "System Software",
    "Embedded Systems",
    "Computer Architecture",
    "Introduction to AI",
    "Mobile App Development",
    "Cryptography",
    "Discrete Mathematics",
  ],

  "CSE": [
    "Data Structures",
    "Database Management",
    "Web Development",
    "Software Engineering",
    "Operating Systems",
    "Computer Networks",
    "Object-Oriented Programming",
    "Java Programming",
    "Python Programming",
    "C Programming",
    "Algorithms",
    "Digital Logic Design",
    "Microprocessors",
    "System Software",
    "Embedded Systems",
    "Computer Architecture",
    "Introduction to AI",
    "Mobile App Development",
    "Cryptography",
    "Discrete Mathematics",
  ],

  // BE ECE variations
  "BE ECE": [
    "Analog Electronics",
    "Digital Electronics",
    "Signals and Systems",
    "Communications",
    "Control Systems",
    "Electromagnetic Theory",
    "Power Systems",
    "VLSI Design",
    "Microwave Engineering",
    "Antennas and Propagation",
  ],

  "BE(ECE)": [
    "Analog Electronics",
    "Digital Electronics",
    "Signals and Systems",
    "Communications",
    "Control Systems",
    "Electromagnetic Theory",
    "Power Systems",
    "VLSI Design",
    "Microwave Engineering",
    "Antennas and Propagation",
  ],

  "ECE": [
    "Analog Electronics",
    "Digital Electronics",
    "Signals and Systems",
    "Communications",
    "Control Systems",
    "Electromagnetic Theory",
    "Power Systems",
    "VLSI Design",
    "Microwave Engineering",
    "Antennas and Propagation",
  ],

  // BE MECH variations
  "BE MECH": [
    "Thermodynamics",
    "Fluid Mechanics",
    "Machine Design",
    "Manufacturing Technology",
    "Heat Transfer",
    "Internal Combustion Engines",
    "Control Systems",
    "Mechanical Vibrations",
  ],

  "BE(MECH)": [
    "Thermodynamics",
    "Fluid Mechanics",
    "Machine Design",
    "Manufacturing Technology",
    "Heat Transfer",
    "Internal Combustion Engines",
    "Control Systems",
    "Mechanical Vibrations",
  ],

  "MECH": [
    "Thermodynamics",
    "Fluid Mechanics",
    "Machine Design",
    "Manufacturing Technology",
    "Heat Transfer",
    "Internal Combustion Engines",
    "Control Systems",
    "Mechanical Vibrations",
  ],
};

// Helper function to get subjects by course (case-insensitive)
export const getSubjectsByCourse = (courseName: string): string[] => {
  // Try exact match first
  if (VTU_SUBJECTS[courseName]) {
    return VTU_SUBJECTS[courseName];
  }
  
  // Try case-insensitive match
  const key = Object.keys(VTU_SUBJECTS).find(
    k => k.toLowerCase() === courseName.toLowerCase()
  );
  
  return key ? VTU_SUBJECTS[key] : [];
};
