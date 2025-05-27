"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { type ReactNode, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "~/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { toast } from "~/components/ui/sonner";
import { createTeamsAndMatchupsAction } from "./actions";
import { type GenerateTeamsSchema, generateTeamsSchema } from "./schemas";

export function GenerateTeamsForm({
	children,
	tournamentId,
}: {
	children: ReactNode;
	tournamentId: string;
}) {
	const form = useForm<GenerateTeamsSchema>({
		resolver: zodResolver(generateTeamsSchema),
		defaultValues: {
			teamSize: 6,
			numSchedules: 3,
			tournamentId,
		},
	});

	const [isPending, startTransition] = useTransition();
	function onSubmit(data: GenerateTeamsSchema) {
		startTransition(async () => {
			const result = await createTeamsAndMatchupsAction(data);
			if (result.error) {
				toast.error(result.error.message);
			} else {
				toast.success("Built Matchups!");
			}
		});
	}

	return (
		<>
			<Form {...form}>
				<div className="justify-center items-center flex h-full">
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-6 bg-sky-green-light p-6 rounded-lg border border-gray-200 shadow-md"
					>
						<h3 className="text-xl font-bold text-sky-700">
							Generate Teams & Matchups
						</h3>

						<FormField
							control={form.control}
							name="teamSize"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="text-sky-700">Team Size</FormLabel>
									<FormControl>
										<Input
											type="number"
											{...field}
											onChange={(e) => {
												// convert from string to number
												field.onChange(Number(e.target.value));
											}}
											className="border-sky-200 focus:border-[var(--sky-500)] focus:ring-[var(--sky-500)]"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="numSchedules"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="text-green-700">
										Number of Schedules
									</FormLabel>
									<FormControl>
										<Input
											type="number"
											{...field}
											onChange={(e) => {
												// convert from string to number
												field.onChange(Number(e.target.value));
											}}
											className="border-green-200 focus:border-[var(--green-500)] focus:ring-[var(--green-500)]"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button
							loading={isPending}
							className="bg-sky-green-gradient hover:from-[var(--sky-700)] hover:to-[var(--green-700)] text-white"
						>
							Build Matchups
						</Button>
					</form>
				</div>
			</Form>
			{isPending ? (
				<div className="size-full flex items-center justify-center">
					<Loader2Icon className="size-6 animate-spin text-sky-600" />
				</div>
			) : (
				children
			)}
		</>
	);
}
