"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { Check, Clock3, LockKeyhole } from "lucide-react";
import { getChatPollOptionPercentage, getChatPollTotalVotes, toggleChatPollOption, type ChatPoll } from "@bhemu/shared";

interface PollCardProps {
	poll: ChatPoll;
	isOwn: boolean;
	canClose: boolean;
	onVote: (pollId: string, optionIds: string[]) => Promise<void>;
	onClose: (pollId: string) => Promise<void>;
}

const PollCard = memo(function PollCard({ poll, isOwn, canClose, onVote, onClose }: PollCardProps) {
	const [selected, setSelected] = useState<string[]>([]);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		setSelected([]);
	}, [poll.id]);

	const totalVotes = useMemo(() => getChatPollTotalVotes(poll.options), [poll.options]);
	const expired = Boolean(poll.closesAt && Date.parse(poll.closesAt) <= Date.now());
	const closed = poll.isClosed || expired;
	const cardClass = isOwn ? "border-white/15 bg-[#08191c]/95" : "border-white/10 bg-[#11191b]/95";
	const optionClass = isOwn
		? "border-white/15 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.07]"
		: "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]";

	const toggleOption = (optionId: string) => {
		if (closed || submitting) return;
		setSelected((current) => toggleChatPollOption(current, optionId, poll.multipleChoice));
	};

	const submitVote = async () => {
		if (closed || selected.length === 0 || submitting) return;
		setSubmitting(true);
		try {
			await onVote(poll.id, selected);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className={`mt-1.5 w-full min-w-[220px] max-w-[300px] rounded-xl border p-2.5 ${cardClass}`}>
			<div className="mb-2.5 flex items-center justify-between gap-2">
				<p className="text-[11px] font-medium text-white/65">
					{poll.multipleChoice ? "Choose all that apply" : "Choose one option"}
				</p>
				{closed ? (
					<span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-white/60">
						<LockKeyhole className="size-3" /> Closed
					</span>
				) : poll.closesAt ? (
					<span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-white/60">
						<Clock3 className="size-3" /> {new Date(poll.closesAt).toLocaleDateString()}
					</span>
				) : null}
			</div>

			<div className="space-y-1.5">
				{poll.options.map((option) => {
					const isSelected = selected.includes(option.id);
					const percentage = getChatPollOptionPercentage(option, totalVotes);
					const isRadio = !poll.multipleChoice;
					return (
						<button
							key={option.id}
							type="button"
							onClick={() => toggleOption(option.id)}
							disabled={closed || submitting}
							aria-pressed={isSelected}
							className={`group relative min-h-10 w-full overflow-hidden rounded-lg border px-2.5 py-1.5 text-left transition-colors duration-150 active:scale-[0.99] ${isSelected ? "border-primary/75 bg-primary/15" : optionClass} disabled:cursor-default disabled:opacity-60`}
						>
							{totalVotes > 0 && (
								<span
									className={`absolute inset-y-0 left-0 transition-[width,background-color] duration-300 ease-out ${isSelected ? "bg-primary/25" : "bg-white/[0.07]"}`}
									style={{ width: `${percentage}%` }}
									aria-hidden="true"
								/>
							)}
							<span className="relative flex items-center gap-2">
								<span
									className={`flex shrink-0 items-center justify-center border transition-colors duration-150 ${isRadio ? "size-4 rounded-full" : "size-4 rounded-md"} ${isSelected ? "border-primary bg-primary text-white" : "border-white/35 text-transparent group-hover:border-white/60"}`}
								>
									{isRadio ? (
										<span
											className={`size-1.5 rounded-full bg-white transition-transform duration-200 ${isSelected ? "scale-100" : "scale-0"}`}
										/>
									) : (
										<Check
											className={`size-3.5 transition-transform duration-200 ${isSelected ? "scale-100" : "scale-0"}`}
											strokeWidth={3}
										/>
									)}
								</span>
								<span
									className={`min-w-0 flex-1 truncate text-[13px] leading-5 ${isSelected ? "font-medium text-white" : "text-white/85"}`}
								>
									{option.optionText}
								</span>
								<span
									className={`text-[11px] font-medium tabular-nums ${isSelected ? "text-primary" : "text-white/65"}`}
								>
									{percentage}%
								</span>
							</span>
						</button>
					);
				})}
			</div>

			<div className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/10 pt-2.5">
				<span className="text-[11px] font-medium text-white/60">
					{totalVotes} {totalVotes === 1 ? "vote" : "votes"}
				</span>
				<div className="flex min-w-36 items-center justify-end gap-2">
					{canClose && !closed && (
						<button
							type="button"
							onClick={() => void onClose(poll.id)}
							disabled={submitting}
							className="min-h-9 rounded-md px-2 text-[11px] font-medium text-white/65 transition-colors hover:bg-red-500/15 hover:text-red-300 disabled:opacity-50"
						>
							Close poll
						</button>
					)}
					{!closed && (
						<button
							type="button"
							onClick={() => void submitVote()}
							disabled={selected.length === 0 || submitting}
							className="min-h-9 rounded-md bg-primary px-3 text-[11px] font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-primary/40 disabled:text-white/60"
						>
							{submitting ? "Saving…" : "Vote"}
						</button>
					)}
				</div>
			</div>
		</div>
	);
});

export default PollCard;
