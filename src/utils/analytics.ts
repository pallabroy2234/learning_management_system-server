import moment from "moment";



export interface IMonthlyData {
	month: string;
	count: number;
}


/**
 * Get the count of documents created in the last twelve months
 * @param model - The mongoose model to query
 * @returns An array of objects containing the month and the count of documents created in that month
 * */
export const lastTwelveMonthsData = async({model}: any): Promise<{
	lastTwelveMonths: IMonthlyData[]
}> => {
	const currentDate = moment();
	const lastTwelveMonths: IMonthlyData[] = [];

	for (let i = 0; i < 12; i++) {
		const targetMonth = currentDate.clone().subtract(i, "months");

		const startDate = targetMonth.clone().startOf("month");
		let endDate = targetMonth.clone().endOf("month");

		// If it's the current month, set the end date to yesterday
		if (i === 0) {
			endDate = currentDate.clone();
		}

		// Format the date for display
		const monthOfYear = i === 0
			? endDate.format("MMM D, YYYY")
			: endDate.endOf("month").format("MMM D, YYYY");

		// Query the count of documents created between startDate and endDate
		const count = await model.countDocuments({
			createdAt: {
				$gte: startDate.toDate(),
				$lte: endDate.toDate()
			}
		});

		// Push the result to the array
		lastTwelveMonths.push({month: monthOfYear, count});
	}
	lastTwelveMonths.reverse();
	return {lastTwelveMonths};
};




