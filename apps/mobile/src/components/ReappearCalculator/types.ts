export interface MarkDetail {
	obt: string;
	max: number;
}

export interface TheoryMarks {
	att: MarkDetail;
	ca: MarkDetail;
	mte: MarkDetail;
	ete: MarkDetail;
}

export interface HybridMarks {
	att: MarkDetail;
	ca: MarkDetail;
	theoryMte: MarkDetail;
	theoryEte: MarkDetail;
	practicalEte: MarkDetail;
}

export interface PracticalMarks {
	att: MarkDetail;
	ca: MarkDetail;
	ete: MarkDetail;
}

export interface ResultType {
	status: "PASS" | "FAIL";
	message: string;
	score?: string;
	required?: string;
}
