import ToasterProvider from './ToasterProvider';
import NavWrapper from './NavWrapper';

export default function Layout({ children }) {
    return (
        <div className="min-h-full bg-slate-50">
            <ToasterProvider />
            <NavWrapper />
            <main>
                <div className="w-full p-0">{ children }</div>
            </main>
        </div>
    )
} 