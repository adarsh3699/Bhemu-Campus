export interface MarkDetail {
	obt: string;
	max: number;
}

export interface TheoryMarks {
	ca: MarkDetail;
	mte: MarkDetail;
	ete: MarkDetail;
}

export interface HybridMarks {
	ca: MarkDetail;
	theoryMte: MarkDetail;
	theoryEte: MarkDetail;
	practicalEte: MarkDetail;
}

export interface PracticalMarks {
	ca: MarkDetail;
	ete: MarkDetail;
}

export interface ResultType {
	status: "PASS" | "FAIL" | "ATTENTION";
	message: string;
	score?: string;
	required?: string;
}
