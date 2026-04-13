import React, { useState, useEffect, useCallback, useMemo } from 'react';
import pb from '../lib/pb';
import {
	format,
	startOfWeek,
	addDays,
	isSameDay,
	startOfMonth,
	endOfMonth,
	startOfDay,
	addMonths,
	subMonths,
	eachDayOfInterval,
} from 'date-fns';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { motion, AnimatePresence } from 'framer-motion';
import RecipePickerModal from '../components/RecipePickerModal';
import { useNavigate } from 'react-router-dom';

const { FiChevronLeft, FiChevronRight, FiPlus, FiCoffee, FiTrash2 } = FiIcons;

const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

function parseNutrition(nutrition) {
	if (!nutrition) return null;
	try { return typeof nutrition === 'string' ? JSON.parse(nutrition) : nutrition; }
	catch { return null; }
}

function getMacros(recipe, mult) {
	const nut = parseNutrition(recipe?.nutrition);
	if (!nut) return null;
	const m = mult || 1;
	const cal = Math.round((nut.calories || 0) * m);
	const p = Math.round((nut.protein || 0) * m);
	const c = Math.round((nut.carbs || 0) * m);
	const f = Math.round((nut.fat || 0) * m);
	if (!cal && !p && !c && !f) return null;
	return { cal, p, c, f };
}

export default function PlannerPage() {
	const [currentDate, setCurrentDate] = useState(new Date());
	const [view, setView] = useState('week'); // 'day' | 'week' | 'month'
	const navigate = useNavigate();
	const [mealSlots, setMealSlots] = useState([]);
	const [loading, setLoading] = useState(true);
	const [modalOpen, setModalOpen] = useState(false);
	const [activeCell, setActiveCell] = useState(null);

	const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
	const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

	// Month helpers
	const monthStart = startOfMonth(currentDate);
	const monthEnd = endOfMonth(currentDate);
	const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
	const calendarEnd = addDays(startOfWeek(addDays(monthEnd, 6), { weekStartsOn: 1 }), 6);
	const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

	const mealPlan = useMemo(() => {
		const map = {};
		mealSlots.forEach(slot => {
			const key = `${slot.date}__${slot.slot}`;
			if (!map[key]) map[key] = [];
			map[key].push(slot);
		});
		return map;
	}, [mealSlots]);

	// Fetch range depends on view
	const fetchStart = view === 'month' ? format(calendarStart, 'yyyy-MM-dd') : format(weekStart, 'yyyy-MM-dd');
	const fetchEnd = view === 'month' ? format(calendarEnd, 'yyyy-MM-dd') : format(addDays(weekStart, 6), 'yyyy-MM-dd');

	const fetchMealPlan = useCallback(async () => {
		setLoading(true);
		try {
			const userId = pb.authStore.model?.id;
			if (!userId) return;
			const res = await pb.collection('meal_slots').getList(1, 400, {
				filter: `meal_plan.user="${userId}" && date >= "${fetchStart}" && date <= "${fetchEnd}"`,
				expand: 'recipe',
			});
			setMealSlots(res.items);
		} catch (e) {
			console.error('Fetch plan error:', e);
		} finally {
			setLoading(false);
		}
	}, [fetchStart, fetchEnd]);

	useEffect(() => { fetchMealPlan(); }, [fetchMealPlan]);

	const handleDeleteSlot = async (slotId) => {
		try {
			await pb.collection('meal_slots').delete(slotId);
			setMealSlots(prev => prev.filter(s => s.id !== slotId));
		} catch (err) {
			console.error('Delete failed:', err);
			alert('Delete failed: ' + err.message);
		}
	};

	const handleAddMeal = async ({ recipe, servings_multiplier }) => {
		if (!activeCell) return;
		try {
			const userId = pb.authStore.model?.id;
			const { date, slot } = activeCell;
			let mealPlanId;
			const plans = await pb.collection('meal_plans').getList(1, 1, {
				filter: `user="${userId}" && week_start_date="${format(weekStart, 'yyyy-MM-dd')}"`
			});
			if (plans.items.length > 0) {
				mealPlanId = plans.items[0].id;
			} else {
				const newPlan = await pb.collection('meal_plans').create({
					user: userId,
					week_start_date: format(weekStart, 'yyyy-MM-dd')
				});
				mealPlanId = newPlan.id;
			}
			await pb.collection('meal_slots').create({
				meal_plan: mealPlanId,
				user_id: userId,
				date,
				slot,
				recipe: recipe.id,
				servings_multiplier
			});
			fetchMealPlan();
		} catch (e) {
			console.error('Add meal error:', e);
		}
		setModalOpen(false);
		setActiveCell(null);
	};

	const navigate_date = (dir) => {
		if (view === 'day') setCurrentDate(d => addDays(d, dir));
		else if (view === 'week') setCurrentDate(d => addDays(d, dir * 7));
		else setCurrentDate(d => dir > 0 ? addMonths(d, 1) : subMonths(d, 1));
	};

	const todayCardStyle = { background: 'linear-gradient(135deg, #10b981, #059669)' };
	const slotCardStyle = { backgroundColor: 'rgba(255,255,255,0.15)' };
	const nothingTextStyle = { color: 'rgba(255,255,255,0.5)' };
	const recipeThumbStyle = { backgroundColor: 'rgba(255,255,255,0.2)' };

	const todayKey = format(new Date(), 'yyyy-MM-dd');
	const todayMeals = MEAL_SLOTS.map(slot => ({
		slot,
		items: mealPlan[`${todayKey}__${slot}`] || []
	}));

	// Period label for header
	const periodLabel = view === 'day'
		? format(currentDate, 'EEEE, MMMM d, yyyy')
		: view === 'week'
			? `${format(weekStart, 'MMM d')} – ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`
			: format(currentDate, 'MMMM yyyy');

	return (
		<div className="space-y-6">

			{/* ── Header ── */}
			<header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Planner</h1>
					<p className="text-gray-500 text-sm mt-0.5">{periodLabel}</p>
				</div>
				<div className="flex items-center gap-3">
					{/* View toggle */}
					<div className="flex items-center bg-white rounded-2xl shadow-sm border border-gray-100 p-1">
						{['day', 'week', 'month'].map(v => (
							<button
								key={v}
								onClick={() => setView(v)}
								className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
									view === v
										? 'bg-emerald-600 text-white shadow-sm'
										: 'text-gray-500 hover:text-gray-800'
								}`}
							>
								{v}
							</button>
						))}
					</div>
					{/* Prev / Next */}
					<div className="flex items-center bg-white rounded-2xl shadow-sm border border-gray-100 p-1">
						<button onClick={() => navigate_date(-1)} className="p-2 hover:bg-gray-50 rounded-xl">
							<SafeIcon icon={FiChevronLeft} className="w-5 h-5 text-gray-400" />
						</button>
						<button
							onClick={() => setCurrentDate(new Date())}
							className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-emerald-600 transition-colors"
						>
							Today
						</button>
						<button onClick={() => navigate_date(1)} className="p-2 hover:bg-gray-50 rounded-xl">
							<SafeIcon icon={FiChevronRight} className="w-5 h-5 text-gray-400" />
						</button>
					</div>
				</div>
			</header>

			{/* ── Today summary card (always visible) ── */}
			<div className="rounded-3xl p-6 text-white shadow-lg" style={todayCardStyle}>
				<div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
					<div className="flex-shrink-0">
						<p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-1">Today</p>
						<h2 className="text-2xl font-bold">{format(new Date(), 'EEEE, MMMM d')}</h2>
					</div>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-auto">
						{todayMeals.map(({ slot, items }) => (
							<div key={slot} className="rounded-2xl p-3" style={slotCardStyle}>
								<p className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider mb-2">{slot}</p>
								{items.length === 0 ? (
									<p className="text-xs italic" style={nothingTextStyle}>Nothing planned</p>
								) : (
									<div className="flex flex-col gap-1.5">
										{items.map(item => {
											const macros = getMacros(item.expand?.recipe, item.servings_multiplier);
											return (
												<div
													key={item.id}
													className="flex items-start gap-2 cursor-pointer"
													onClick={() => { const id = item.recipe || item.expand?.recipe?.id; if (id) navigate(`/recipes/${id}`); }}
												>
													<div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0" style={recipeThumbStyle}>
														{item.expand?.recipe?.image_url
															? <img src={item.expand.recipe.image_url} className="w-full h-full object-cover" />
															: <div className="w-full h-full flex items-center justify-center"><SafeIcon icon={FiCoffee} className="w-3 h-3 text-white opacity-60" /></div>
														}
													</div>
													<div className="flex-1 min-w-0">
														<p className="text-white text-[11px] font-semibold leading-tight line-clamp-1">{item.expand?.recipe?.title}</p>
														{macros && (
															<p className="text-emerald-100 text-[9px] font-bold mt-0.5">
																🔥{macros.cal} · P{macros.p}g · C{macros.c}g · F{macros.f}g
															</p>
														)}
													</div>
												</div>
											);
										})}
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			</div>

			{/* ── Views ── */}
			{loading ? (
				<div className="flex items-center justify-center py-24">
					<div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
				</div>
			) : (
				<>
					{view === 'day' && <DayView date={currentDate} mealPlan={mealPlan} onAdd={(slot) => { setActiveCell({ date: format(currentDate, 'yyyy-MM-dd'), slot }); setModalOpen(true); }} onDelete={handleDeleteSlot} navigate={navigate} />}
					{view === 'week' && <WeekView days={days} mealPlan={mealPlan} onAdd={(date, slot) => { setActiveCell({ date, slot }); setModalOpen(true); }} onDelete={handleDeleteSlot} navigate={navigate} />}
					{view === 'month' && <MonthView calendarDays={calendarDays} currentDate={currentDate} mealPlan={mealPlan} onAdd={(date, slot) => { setActiveCell({ date, slot }); setModalOpen(true); }} onDelete={handleDeleteSlot} navigate={navigate} onDayClick={(day) => { setCurrentDate(day); setView('day'); }} />}
				</>
			)}

			<RecipePickerModal isOpen={modalOpen} onClose={() => { setModalOpen(false); setActiveCell(null); }} onSelect={handleAddMeal} />
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// DAY VIEW — full macro details
// ─────────────────────────────────────────────────────────────────────────────
function DayView({ date, mealPlan, onAdd, onDelete, navigate }) {
	const dateKey = format(date, 'yyyy-MM-dd');
	const isToday = isSameDay(date, new Date());

	return (
		<div className="space-y-4">
			{MEAL_SLOTS.map(slot => {
				const items = mealPlan[`${dateKey}__${slot}`] || [];
				return (
					<div key={slot} className={`rounded-2xl border p-4 ${isToday ? 'border-emerald-200 bg-emerald-50/40' : 'border-gray-100 bg-white'}`}>
						<div className="flex items-center justify-between mb-3">
							<div className="flex items-center gap-2">
								<SafeIcon icon={FiCoffee} className="w-4 h-4 text-emerald-500" />
								<h3 className="font-bold text-gray-800 text-sm uppercase tracking-widest">{slot}</h3>
							</div>
							<button
								onClick={() => onAdd(slot)}
								className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-colors"
							>
								<SafeIcon icon={FiPlus} className="w-3.5 h-3.5" />
							</button>
						</div>

						{items.length === 0 ? (
							<p className="text-sm text-gray-400 italic">Nothing planned — tap + to add a recipe</p>
						) : (
							<div className="space-y-3">
								{items.map(item => {
									const recipe = item.expand?.recipe;
									const macros = getMacros(recipe, item.servings_multiplier);
									return (
										<div key={item.id} className="flex items-start gap-3 bg-white rounded-xl p-3 border border-gray-100 shadow-sm group/card relative">
											{/* Image */}
											<div
												className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-emerald-50 flex items-center justify-center cursor-pointer"
												onClick={() => { const id = item.recipe || recipe?.id; if (id) navigate(`/recipes/${id}`); }}
											>
												{recipe?.image_url
													? <img src={recipe.image_url} className="w-full h-full object-cover" />
													: <SafeIcon icon={FiCoffee} className="w-6 h-6 text-emerald-200" />
												}
											</div>
											{/* Info */}
											<div className="flex-1 min-w-0">
												<h4
													className="font-bold text-gray-900 text-sm leading-tight cursor-pointer hover:text-emerald-600 transition-colors mb-1"
													onClick={() => { const id = item.recipe || recipe?.id; if (id) navigate(`/recipes/${id}`); }}
												>
													{recipe?.title || 'Unknown recipe'}
												</h4>
												{item.servings_multiplier > 1 && (
													<span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md mr-2">{item.servings_multiplier}x servings</span>
												)}
												{macros ? (
													<div className="flex flex-wrap gap-1.5 mt-2">
														<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100">🔥 {macros.cal} cal</span>
														<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">P {macros.p}g</span>
														<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-600 border border-yellow-100">C {macros.c}g</span>
														<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 border border-pink-100">F {macros.f}g</span>
													</div>
												) : (
													<p className="text-[10px] text-gray-400 mt-1">No nutrition data</p>
												)}
											</div>
											{/* Delete */}
											<button
												onClick={() => onDelete(item.id)}
												className="absolute top-2 right-2 p-1.5 text-red-400 hover:bg-red-50 rounded-lg opacity-0 group-hover/card:opacity-100 transition-opacity"
											>
												<SafeIcon icon={FiTrash2} className="w-3.5 h-3.5" />
											</button>
										</div>
									);
								})}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// WEEK VIEW — image + name
// ─────────────────────────────────────────────────────────────────────────────
function WeekView({ days, mealPlan, onAdd, onDelete, navigate }) {
	return (
		<div className="space-y-6">
			{/* Day headers */}
			<div className="hidden md:grid grid-cols-7 gap-2">
				{days.map(day => (
					<div
						key={day.toString()}
						className="flex flex-col items-center p-3 rounded-2xl border transition-all"
						style={isSameDay(day, new Date())
							? { backgroundColor: '#d1fae5', color: '#065f46', borderColor: '#6ee7b7' }
							: { backgroundColor: '#fff', color: '#4b5563', borderColor: '#f3f4f6' }
						}
					>
						<span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{format(day, 'EEE')}</span>
						<span className="text-lg font-bold">{format(day, 'd')}</span>
					</div>
				))}
			</div>

			{/* Meal rows */}
			{MEAL_SLOTS.map(slot => (
				<section key={slot}>
					<div className="flex items-center gap-2 mb-3">
						<SafeIcon icon={FiCoffee} className="w-4 h-4 text-emerald-500" />
						<h3 className="font-bold text-gray-800 uppercase tracking-widest text-[10px]">{slot}</h3>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-7 gap-3">
						{days.map(day => {
							const dateKey = format(day, 'yyyy-MM-dd');
							const items = mealPlan[`${dateKey}__${slot}`] || [];
							return (
								<div
									key={day.toString()}
									className="min-h-[100px] rounded-xl group"
									style={isSameDay(day, new Date()) ? { backgroundColor: 'rgba(209,250,229,0.4)' } : {}}
								>
									<div className="h-full flex flex-col gap-2">
										<AnimatePresence>
											{items.map(item => (
												<motion.div
													key={item.id}
													initial= opacity: 0, scale: 0.95 
													animate= opacity: 1, scale: 1 
													exit= opacity: 0, scale: 0.95, height: 0 
													className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden relative group/card w-full"
												>
													{/* Recipe image */}
													<div
														className="w-full h-16 bg-emerald-50 flex items-center justify-center overflow-hidden cursor-pointer"
														onClick={() => { const id = item.recipe || item.expand?.recipe?.id; if (id) navigate(`/recipes/${id}`); }}
													>
														{item.expand?.recipe?.image_url
															? <img src={item.expand.recipe.image_url} className="w-full h-full object-cover" loading="lazy" />
															: <SafeIcon icon={FiCoffee} className="w-6 h-6 text-emerald-200" />
														}
													</div>
													{/* Recipe name */}
													<p
														className="text-[9px] font-bold text-gray-800 px-2 py-1.5 leading-tight line-clamp-2 cursor-pointer hover:text-emerald-600"
														onClick={() => { const id = item.recipe || item.expand?.recipe?.id; if (id) navigate(`/recipes/${id}`); }}
													>
														{item.expand?.recipe?.title}
													</p>
													<button
														onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(item.id); }}
														className="absolute top-1 right-1 p-1 text-red-400 hover:bg-red-50 rounded-md opacity-0 group-hover/card:opacity-100 transition-opacity"
													>
														<SafeIcon icon={FiTrash2} className="w-3 h-3" />
													</button>
												</motion.div>
											))}
										</AnimatePresence>
										<button
											onClick={() => onAdd(dateKey, slot)}
											className={`w-full ${items.length > 0 ? 'py-1.5 mt-auto' : 'h-full min-h-[60px]'} border-2 border-dashed border-gray-100 rounded-xl flex items-center justify-center text-gray-300 hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50/50 transition-all`}
										>
											<SafeIcon icon={FiPlus} className="w-4 h-4" />
										</button>
									</div>
								</div>
							);
						})}
					</div>
				</section>
			))}
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// MONTH VIEW — recipe names only, clicking a day goes to day view
// ─────────────────────────────────────────────────────────────────────────────
function MonthView({ calendarDays, currentDate, mealPlan, onAdd, onDelete, navigate, onDayClick }) {
	const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	const today = new Date();

	return (
		<div>
			{/* Day-of-week headers */}
			<div className="grid grid-cols-7 gap-1 mb-1">
				{DAY_HEADERS.map(d => (
					<div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest py-1">{d}</div>
				))}
			</div>

			{/* Calendar grid */}
			<div className="grid grid-cols-7 gap-1">
				{calendarDays.map(day => {
					const dateKey = format(day, 'yyyy-MM-dd');
					const isToday = isSameDay(day, today);
					const isCurrentMonth = day.getMonth() === currentDate.getMonth();
					// Collect all recipes planned this day across all meal slots
					const allItems = MEAL_SLOTS.flatMap(slot => mealPlan[`${dateKey}__${slot}`] || []);

					return (
						<div
							key={dateKey}
							className={`min-h-[90px] rounded-xl p-1.5 border transition-all cursor-pointer hover:border-emerald-300 ${
								isToday
									? 'border-emerald-400 bg-emerald-50'
									: isCurrentMonth
										? 'border-gray-100 bg-white'
										: 'border-gray-50 bg-gray-50/50'
								}`}
							onClick={() => onDayClick(day)}
						>
							{/* Date number */}
							<div className={`text-[10px] font-bold mb-1 ${
								isToday ? 'text-emerald-700' : isCurrentMonth ? 'text-gray-700' : 'text-gray-300'
							}`}>{format(day, 'd')}</div>

							{/* Recipe names */}
							<div className="space-y-0.5">
								{allItems.slice(0, 3).map(item => (
									<div
										key={item.id}
										className="text-[8px] font-semibold text-emerald-700 bg-emerald-50 rounded px-1 py-0.5 truncate leading-tight"
										onClick={(e) => { e.stopPropagation(); const id = item.recipe || item.expand?.recipe?.id; if (id) navigate(`/recipes/${id}`); }}
									>
										{item.expand?.recipe?.title || '...'}
									</div>
								))}
								{allItems.length > 3 && (
									<div className="text-[8px] text-gray-400 font-bold px-1">+{allItems.length - 3} more</div>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
