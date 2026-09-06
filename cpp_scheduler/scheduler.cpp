#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <chrono>
#include <sstream>
#include <iomanip>
#include <map>

struct TimeSlot {
    std::string day;        // "Monday", "Tuesday", etc.
    int hourIndex;          // 0 to 23
    std::string spanLabel;  // "08:00 AM - 09:00 AM"
    std::string status;     // "SLEEP", "MEAL", "ACADEMIC", "GOAL_CHEMISTRY", "GOAL_SDE_DSA", "FREE"
    std::string title;
    std::string description;
};

// Convert hour (0-23) to AM/PM string
std::string formatHourAmPm(int hour) {
    std::string period = (hour >= 12) ? "PM" : "AM";
    int displayH = (hour % 12 == 0) ? 12 : (hour % 12);
    std::stringstream ss;
    ss << std::setw(2) << std::setfill('0') << displayH << ":00 " << period;
    return ss.str();
}

int main(int argc, char* argv[]) {
    auto startClock = std::chrono::high_resolution_clock::now();

    // Default configuration (parsed or default)
    int wakeHour = 7;     // 7:00 AM
    int sleepHour = 23;   // 11:00 PM
    int breakfastHour = 8;
    int lunchHour = 13;
    int dinnerHour = 20;

    std::vector<std::string> days = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"};

    std::vector<TimeSlot> weeklyGrid;

    for (const auto& day : days) {
        for (int h = 0; h < 24; ++h) {
            std::string startLabel = formatHourAmPm(h);
            std::string endLabel = formatHourAmPm((h + 1) % 24);
            std::string spanStr = startLabel + " - " + endLabel;

            std::string status = "FREE";
            std::string title = "Available Free Slot";
            std::string desc = "Unscheduled time slot available for self-study, rest, or custom project allocation.";

            // 1. Sleep Schedule
            if (h < wakeHour || h >= sleepHour) {
                status = "SLEEP";
                title = "Rest & Recovery (Sleep)";
                desc = "Scheduled sleep window for optimal cognitive recovery and memory consolidation.";
            }
            // 2. Meals
            else if (h == breakfastHour) {
                status = "MEAL";
                title = "Breakfast & Morning Prep";
                desc = "Nutritional intake and daily morning routine.";
            }
            else if (h == lunchHour) {
                status = "MEAL";
                title = "Lunch Break";
                desc = "Midday meal and mental pause.";
            }
            else if (h == dinnerHour) {
                status = "MEAL";
                title = "Dinner & Evening Rest";
                desc = "Evening meal and relaxation.";
            }
            // 3. Academic Commitments (IIT KGP & Lectures)
            else if ((day != "Saturday" && day != "Sunday") && (h >= 9 && h <= 12)) {
                status = "ACADEMIC";
                title = (h == 9) ? "BS Chemistry (IIT KGP) Core" : "Academic Lecture / Lab";
                desc = (h == 9) ? "1-hour dedicated allocation for BS Chemistry coursework and assignment review."
                                : "Departmental lecture and academic coursework commitment.";
            }
            // 4. Goal Habit Allocations (SDE Intern Prep / DSA)
            else if (h >= 15 && h <= 17) {
                status = "GOAL_SDE_DSA";
                title = "SDE Intern Prep: DSA & Systems";
                desc = "High-priority focus session for Data Structures, Algorithms, Topological Sorting, and System Architecture practice.";
            }

            weeklyGrid.push_back({day, h, spanStr, status, title, desc});
        }
    }

    auto endClock = std::chrono::high_resolution_clock::now();
    double elapsedUs = std::chrono::duration<double, std::micro>(endClock - startClock).count();

    // Output JSON result for 7-day x 24-hour weekly grid
    std::cout << "{\n";
    std::cout << "  \"status\": \"SUCCESS\",\n";
    std::cout << "  \"engine\": \"C++ Weekly Matrix Scheduler v3.0\",\n";
    std::cout << "  \"execution_time_microseconds\": " << elapsedUs << ",\n";
    std::cout << "  \"days\": [\"Monday\", \"Tuesday\", \"Wednesday\", \"Thursday\", \"Friday\", \"Saturday\", \"Sunday\"],\n";
    std::cout << "  \"total_slots\": " << weeklyGrid.size() << ",\n";
    std::cout << "  \"grid\": [\n";
    for (size_t i = 0; i < weeklyGrid.size(); ++i) {
        const auto& slot = weeklyGrid[i];
        std::cout << "    {\n"
                  << "      \"day\": \"" << slot.day << "\",\n"
                  << "      \"hour\": " << slot.hourIndex << ",\n"
                  << "      \"span_label\": \"" << slot.spanLabel << "\",\n"
                  << "      \"status\": \"" << slot.status << "\",\n"
                  << "      \"title\": \"" << slot.title << "\",\n"
                  << "      \"description\": \"" << slot.description << "\"\n"
                  << "    }" << (i + 1 < weeklyGrid.size() ? "," : "") << "\n";
    }
    std::cout << "  ]\n";
    std::cout << "}\n";

    return 0;
}
