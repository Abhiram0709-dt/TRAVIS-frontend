# Banking Assistant Application

A modern web application that provides banking assistance through natural language processing, connecting a React frontend with a FastAPI backend.

## Features

- **Intuitive Chat Interface**: Easy-to-use chat UI for interacting with the banking assistant
- **Natural Language Processing**: Backend ML model that understands and responds to banking queries
- **Message Management**: Ability to delete individual messages or clear the entire chat history
- **Error Handling**: Robust error boundary and graceful error states
- **Theme Support**: Light and dark mode options for accessibility
- **Responsive Design**: Works across desktop and mobile devices

## Setup and Installation

### Frontend (React)

1. Navigate to the `banking-react-app` directory
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following content:
   ```
   REACT_APP_API_BASE_URL=http://localhost:5000
   REACT_APP_ENV=development
   ```
4. Start the development server:
   ```bash
   npm start
   ```

### Backend (FastAPI)

1. Navigate to the backend directory
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```

## Production Deployment

1. Update the `.env` file:
   ```
   REACT_APP_API_BASE_URL=https://your-backend-url.com
   REACT_APP_ENV=production
   ```
2. Build the React app:
   ```bash
   npm run build
   ```
3. Deploy the build folder to your web hosting service
4. Configure your FastAPI server with proper CORS settings for your production domain

## Project Structure

- `src/components`: React components including MessageList, ChatPage, etc.
- `src/contexts`: React context providers for themes, authentication, etc.
- `src/styles`: CSS files for styling components
- `src/config.js`: Configuration settings and environment variables

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 