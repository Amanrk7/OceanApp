import { App2Context, App2Provider } from "./Context/store2Switch.jsx";

export const App2 = () => {
    const { setIsStore2 } = useContext(App2Context);
    const set = () => {
        setIsStore2(prev => !prev);
    };
    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h1 style={{ color: '#333' }}>Welcome to Store 2</h1>
            <p style={{ color: '#555', fontSize: '18px' }}>
                This is the new store interface. Here you can manage your inventory, view sales reports, and handle customer orders with ease.
            </p>
            <p style={{ color: '#555', fontSize: '18px' }}>
                Explore the new features and enjoy a seamless shopping experience!
            </p>

            <button onClick={set}>
                Toggle Store 2
            </button>
        </div>
    );
}
