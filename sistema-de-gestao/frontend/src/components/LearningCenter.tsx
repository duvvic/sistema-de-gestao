import React from 'react';
import { ExternalLink, BookOpen, MonitorPlay } from 'lucide-react';
import sapBanner from '@/assets/sap_banner.png';
import udemyBanner from '@/assets/udemy_banner_custom.jpg';
import sapLogoHeader from '@/assets/sap_logo_header.jpg';
import nicLabsLogo from '@/assets/nic_labs_logo.png';

const LearningCenter: React.FC = () => {
    const resources: {
        title: string;
        description: string;
        url: string;
        icon: React.ElementType;
        color: string;
        textColor: string;
        image?: string;
    }[] = [
            {
                title: 'Descomplicando Linguagens (SAP)',
                description: 'Material especializado em SAP e linguagens de programação corporativas. Ideal para aprofundar conhecimentos técnicos específicos.',
                url: 'https://www.descomplicandolinguagens.com.br/',
                icon: BookOpen,
                color: 'bg-blue-600',
                textColor: 'text-blue-100',
                image: sapBanner
            },
            {
                title: 'Udemy',
                description: 'Plataforma líder de cursos online. Encontre tutoriais de React, Node.js, Design Patterns e muito mais para sua evolução profissional.',
                url: 'https://www.udemy.com/',
                icon: MonitorPlay,
                color: 'bg-purple-600',
                textColor: 'text-purple-100',
                image: udemyBanner
            }
        ];

    return (
        <div className="p-4 max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Logo Area - Wrapped in white for better contrast of original logo colors */}
                <div className="flex items-center gap-6 bg-white rounded-2xl p-4 shadow-lg shadow-black/5 border border-gray-100">
                    <img src={sapLogoHeader} alt="SAP" className="h-12 w-auto object-contain" />
                    <div className="h-10 w-px bg-gray-200" />
                    <img src={nicLabsLogo} alt="Nic-Labs" className="h-12 w-auto object-contain" />
                </div>

                <div className="text-right flex flex-col items-end">
                    <h1 className="text-3xl font-bold text-[var(--text)] tracking-tight">
                        Central de Estudos
                    </h1>
                    <p className="text-[var(--textMuted)] text-base font-medium opacity-80">
                        Recursos recomendados para aprimoramento técnico.
                    </p>
                </div>
            </div>

            {/* Grid de Cards */}
            <div className="flex flex-col gap-6">
                {resources.map((resource, index) => {
                    return (
                        <a
                            key={index}
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative h-48 w-full rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500"
                        >
                            {/* Background Image Layer */}
                            {resource.image ? (
                                <div className="absolute inset-0 bg-white">
                                    <img
                                        src={resource.image}
                                        alt={resource.title}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                </div>
                            ) : (
                                <div className={`absolute inset-0 w-full h-full ${resource.color} opacity-90 transition-transform duration-700 group-hover:scale-110`}>
                                    {/* Abstract shapes for non-image cards */}
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl -mr-10 -mt-10" />
                                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-black opacity-10 rounded-full blur-3xl -ml-10 -mb-10" />
                                </div>
                            )}

                            {/* Dark Gradient Overlay for Readability */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent group-hover:from-black/95 group-hover:via-black/50 transition-colors duration-300" />

                            {/* Content Layer */}
                            <div className="absolute inset-0 p-6 flex flex-col justify-between">
                                {/* Top Content: Title + Icon */}
                                <div className="flex justify-between items-start">
                                    <h3 className="text-2xl font-bold text-white drop-shadow-md w-3/4 leading-tight">
                                        {resource.title}
                                    </h3>

                                    {/* Icon Badge */}
                                    <div className={`p-2 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 group-hover:bg-white/20 transition-all`}>
                                        <resource.icon size={20} />
                                    </div>
                                </div>

                                {/* Bottom Content: Description + Button */}
                                <div>
                                    <div className="flex items-center gap-2 text-white font-bold text-sm bg-white/20 backdrop-blur-sm self-start inline-flex px-4 py-2 rounded-full border border-white/30 group-hover:bg-white/30 transition-all duration-300 hover:scale-105">
                                        <span className="uppercase tracking-wider text-xs">Acessar Portal</span>
                                        <ExternalLink size={14} />
                                    </div>
                                </div>
                            </div>

                            {/* Border Glow Effect on Hover */}
                            <div className="absolute inset-0 border-2 border-white/0 group-hover:border-white/20 rounded-2xl transition-all duration-300 pointer-events-none" />
                        </a>
                    );
                })}
            </div>
        </div>
    );
};

export default LearningCenter;
