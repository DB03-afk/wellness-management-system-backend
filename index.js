require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const User = require('./models/user.model');
const MealLog = require('./models/meallog.model');
const FunFact = require('./models/funfact.model');

port = process.env.PORT || 4000;

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World!');
});

// create a new user
app.post('/api/createUser', async (req, res) => {
    try {
        // Validate and create a new user instance with the request data
        const user = new User({
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            height: req.body.height,
            weight: req.body.weight,
            age: req.body.age,
            gender: req.body.gender
        });

        // Save the user to the database
        const savedUser = await user.save();

        // Respond with the newly created user
        res.status(201).json(savedUser);
    } catch (error) {
        // Handle and respond to any errors
        res.status(500).json({ error: error.message });
    }
});

// get all users
app.get('/api/getUsers', async (req, res) => {
    try {
        // Get all users from the database
        const users = await User.find();

        // Respond with the users
        res.status(200).json(users);
    } catch (error) {
        // Handle and respond to any errors
        res.status(500).json({ error: error.message });
    }
});

//Genrate meal plane
async function generateMealPlan(userPreferences) {
    const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a helpful meal planning assistant." },
                { role: "user", content: `Create a meal plan based on the following preferences: ${userPreferences}` }
            ]
        },
        {
            headers: {
                'Authorization': `Bearer YOUR_OPENAI_API_KEY`,
                'Content-Type': 'application/json'
            }
        }
    );
    return response.data.choices[0].message.content;
}

app.post('/api/gerateMealPlane', async (req, res) => {
    try {
        // Extract user preferences from the request body
        const { userPreferences } = req.body;

        // Call the function to generate the meal plan
        //const mealPlan = await generateMealPlan(userPreferences);

        // Send the meal plan as the response
        res.json({
            message: 'Meal plan generated successfully',
            mealPlan: mealPlan
        });
    } catch (error) {
        // Handle any errors that occur
        console.error('Error generating meal plan:', error);
        res.status(500).json({
            message: 'An error occurred while generating the meal plan',
            error: error.message
        });
    }
});


// update user by email
app.put('/api/updateUser', async (req, res) => {
    try {
        // Find the user by email
        const user = await User.findOne({ email: req.body.email });

        // If the user doesn't exist
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update the user with the request data
        try {
            user.firstName = req.body.firstName;
            user.lastName = req.body.lastName;
            user.height = req.body.height;
            user.weight = req.body.weight;
            user.age = req.body.age;
            user.gender = req.body.gender;
        } catch (error) {
            return res.status(400).json({ error: 'Invalid request data' });
        }

        // Save the updated user to the database
        const updatedUser = await user.save();

        // Respond with the updated user
        res.status(200).json(updatedUser);
    } catch (error) {
        // Handle and respond to any errors
        res.status(500).json({ error: error.message });
    }
});

// delete user by email
app.delete('/api/deleteUser', async (req, res) => {
    try {
        // Find the user by email and delete it
        const deletedUser = await User.findOneAndDelete({ email: req.body.email });
        
        // If the user doesn't exist
        if (!deletedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Respond with the deleted user
        res.status(200).json(deletedUser);
    } catch (error) {
        // Handle and respond to any errors
        res.status(500).json({ error: error.message });
    }
});

//getFunFact
app.get('/api/getFunFact', async (req, res) => {
    try {
        // Use MongoDB's aggregation to get a random sample of 2 fun facts
        const funFact = await FunFact.aggregate([{ $sample: { size: 2 } }]);

        // Respond with the fun facts
        res.status(200).json(funFact);
    } catch (error) {
        // Handle and respond to any errors
        res.status(500).json({ error: error.message });
    }
});

// Route to add a new fitness fun fact (POST request with JSON body)
app.post('/api/addFunFact', async (req, res) => {
    try {
        const { fact } = req.body;

        if (!fact) {
            return res.status(400).json({ error: 'A fun fact is required' });
        }

        const newFunFact = new FunFact({ fact });
        await newFunFact.save();

        res.status(200).json({ message: 'Fun fact saved successfully', data: newFunFact });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

//get meal log
// GET meal log by email ID
app.get('/api/getMealLog', async (req, res) => {
    try {
        const { emailID } = req.query;

        // Check if emailID is provided
        if (!emailID) {
            return res.status(400).json({ error: "Email ID is required" });
        }

        // Find meal logs by email ID
        const mealLogs = await MealLog.find({ emailID: emailID });

        // Respond with the meal logs
        if (mealLogs.length > 0) {
            res.status(200).json(mealLogs);
        } else {
            res.status(404).json({ message: "No meal logs found for this email ID" });
        }
    } catch (error) {
        // Handle and respond to any errors
        res.status(500).json({ error: error.message });
    }
});


// post meal log
app.post('/api/addMealLog', async (req, res) => {
    try {
        const { meal, calories, date, emailID } = req.body;

        // Validate required fields
        if (!meal || !calories || !date || !emailID) {
            return res.status(400).json({ error: "All fields are required: meal, calories, date, emailID" });
        }

        // Create a new MealLog document
        const newMealLog = new MealLog({
            meal,
            calories,
            date: new Date(date), // Ensure date is in the correct format
            emailID
        });

        // Save to database
        await newMealLog.save();

        res.status(201).json({ message: "Meal log created successfully", data: newMealLog });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log('Connected to MongoDB');
    app.listen(port, () => {
    console.log('Server is running on port', port);
});
})
.catch((err) => {
    console.log('Error connecting to MongoDB', err);
});