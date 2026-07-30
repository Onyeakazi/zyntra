import { Image, Pressable, Text, TextInput, TouchableOpacity, View, Alert, ScrollView } from 'react-native'
import createResponsiveStyleSheet from '../../utils/responsiveStyleSheet'
import { router } from 'expo-router'
import Constants, { ExecutionEnvironment } from 'expo-constants';
import Logo from "../../assets/images/brand.png";
import TYPOGRAHPY from "../../constants/typography";
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../../components/Button';
import GoogleIcon from "../../assets/vectors/google.svg";
import FloatingInput from '../../components/Input';
import { auth } from "../../config/firebase";
import { supabase } from "../../lib/supabase";
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";

// Check if running in Expo Go
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Configure Google Sign-In (only if not in Expo Go)
if (!isExpoGo) {
  try {
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      forceCodeForRefreshToken: false,
      offlineAccess: true,
    });
  } catch (error) {
    console.warn("Failed to configure Google Sign-In:", error);
  }
}

const mapAuthErrorToMessage = (error) => {
    console.error("Auth Error:", error.code, error.message);
    switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
            return 'Incorrect email or password. Please check your credentials and try again.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/email-already-in-use':
            return 'This email address is already in use by another account.';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters.';
        case 'auth/too-many-requests':
            return 'Too many login attempts. Your account has been temporarily locked. Please try again later.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your internet connection and try again.';
        default:
            if (error.message && error.message.includes('Firebase:')) {
                return error.message.replace('Firebase:', '').replace(/\(auth\/.*\)\.?/, '').trim();
            }
            return error.message || 'An error occurred. Please try again.';
    }
};

const Login = () => {
    const { t } = useTranslation();
    const [active, setActive] = useState("signin");
    const [isFocused, setIsFocused] = useState(false);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [fieldError, setFieldError] = useState({
        fullName: false,
        email: false,
        password: false,
        confirmPassword: false,
    });
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [signinData, setSigninData] = useState({
        email: "",
        password: "",
    });

    const [signupData, setSignupData] = useState({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    const handleShowTerms = () => {
        const lang = t('settings.selectLanguage');
        let title = "Terms & Conditions";
        let message = "Welcome to Zyntra!\n\n1. Acceptance of Terms: By creating an account, you agree to comply with Zyntra's community standards and terms.\n2. User Content: You are responsible for the content you post.\n3. Account Security: Keep your password safe.\n4. Prohibited Behavior: Harassment, hate speech, and spam are strictly prohibited.";
        
        if (lang === 'Seleccionar Idioma') {
            title = "Términos y Condiciones";
            message = "¡Bienvenido a Zyntra!\n\n1. Aceptación de los términos: Al crear una cuenta, acepta cumplir con las normas y términos de la comunidad de Zyntra.\n2. Contenido del usuario: Usted es responsable del contenido que publica.\n3. Seguridad de la cuenta: Mantenga su contraseña segura.\n4. Comportamiento prohibido: El acoso, el discurso de odio y el spam están estrictamente prohibidos.";
        } else if (lang === 'Choisir la langue') {
            title = "Conditions Générales";
            message = "Bienvenue sur Zyntra !\n\n1. Acceptation des conditions: En créant un compte, vous acceptez de respecter les normes et conditions de la communauté Zyntra.\n2. Contenu de l'utilisateur: Vous êtes responsable du contenu que vous publiez.\n3. Sécurité du compte: Gardez votre mot de passe en sécurité.\n4. Comportements interdits: Le harcèlement, les discours de haine et le spam sont strictement interdits.";
        } else if (lang === 'Definir idioma') {
            title = "Termos & Condições";
            message = "Bem-vindo ao Zyntra!\n\n1. Aceitação dos Termos: Ao criar uma conta, você concorda em cumprir os padrões e termos da comunidade do Zyntra.\n2. Conteúdo do Usuário: Você é responsável pelo conteúdo que publica.\n3. Segurança da Conta: Mantenha sua senha segura.\n4. Comportamento Proibido: Assédio, discurso de ódio e spam são estritamente proibidos.";
        }
        
        Alert.alert(title, message);
    };

    const handleShowPrivacy = () => {
        const lang = t('settings.selectLanguage');
        let title = "Privacy Policy";
        let message = "Zyntra values your privacy:\n\n1. Information Collection: We collect information you provide (name, email, profile updates).\n2. Information Use: We use your data to power professional networking connections, stories, and feed posts.\n3. Security: We implement standard security procedures to protect your data.";
        
        if (lang === 'Seleccionar Idioma') {
            title = "Política de Privacidad";
            message = "Zyntra valora su privacidad:\n\n1. Recopilación de información: Recopilamos la información que proporciona (nombre, correo electrónico, actualizaciones de perfil).\n2. Uso de la información: Usamos sus datos para impulsar las conexiones profesionales, historias y publicaciones.\n3. Seguridad: Implementamos procedimientos de seguridad estándar para proteger sus datos.";
        } else if (lang === 'Choisir la langue') {
            title = "Politique de Confidentialité";
            message = "Zyntra respecte votre vie privée :\n\n1. Collecte d'informations: Nous collectons les informations que vous fournissez (nom, email, mises à jour de profil).\n2. Utilisation des informations: Nous utilisons vos données pour alimenter les connexions professionnelles, les stories et les publications.\n3. Sécurité: Nous mettons en œuvre des procédures de sécurité standard pour protéger vos données.";
        } else if (lang === 'Definir idioma') {
            title = "Política de Privacidade";
            message = "O Zyntra valoriza sua privacidade:\n\n1. Coleta de Informações: Coletamos informações que você fornece (nome, e-mail, atualizações de perfil).\n2. Uso de Informações: Usamos seus dados para alimentar as conexões de rede profissional, histórias e publicações no feed.\n3. Segurança: Implementamos procedimentos de segurança padrão para proteger seus dados.";
        }
        
        Alert.alert(title, message);
    };

    // Handle Google Sign-In
    const handleGoogleSignIn = async () => {
        // Check if in Expo Go
        if (isExpoGo) {
            alert("Google Sign-In is not available in Expo Go.\n\nPlease use the built APK to test Google Sign-In.\n\nYou can still test email/password login here!");
            return;
        }

        try {
            const { GoogleSignin } = require('@react-native-google-signin/google-signin');
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            const userInfo = await GoogleSignin.signIn();
            const { idToken } = userInfo.data;

            if (!idToken) {
                alert("Failed to get ID token");
                return;
            }

            // Sign into Firebase
            const credential = GoogleAuthProvider.credential(idToken);
            const userCredential = await signInWithCredential(auth, credential);
            const firebaseUser = userCredential.user;

            // Check if user exists in Supabase
            const { data: existingUser, error: checkError } = await supabase
                .from("users")
                .select("id")
                .eq("id", firebaseUser.uid)
                .single();

            if (checkError || !existingUser) {
                // Generate a clean and unique username from full name
                const nameSource = firebaseUser.displayName || firebaseUser.email || "user";
                const baseUsername = nameSource.includes('@')
                    ? nameSource.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
                    : nameSource.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                const username = `${baseUsername}${Math.floor(100 + Math.random() * 900)}`;

                const { error: supabaseError } = await supabase
                    .from("users")
                    .insert({
                        id: firebaseUser.uid,
                        email: firebaseUser.email || "",
                        full_name: firebaseUser.displayName || "Google User",
                        username: username,
                        avatar_url: firebaseUser.photoURL || "",
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    });

                if (supabaseError) {
                    console.error("Supabase insert error for Google user:", supabaseError);
                }
            }

            await AsyncStorage.setItem("user_logged_in", "true");

            alert("Google login successful!");
            router.push("/(tabs)");
        } catch (error) {
            const { statusCodes } = require('@react-native-google-signin/google-signin');
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                alert("Sign in cancelled");
            } else if (error.code === statusCodes.IN_PROGRESS) {
                alert("Sign in in progress");
            } else {
                alert("Google Sign-In Error: " + error.message);
            }
        }
    };

    const handleSignup = async () => {
        let errors = {
            fullName: false,
            email: false,
            password: false,
            confirmPassword: false,
        };

        let message = "";

        // ALL FIELDS EMPTY
        if (
            !signupData.fullName.trim() &&
            !signupData.email.trim() &&
            !signupData.password.trim() &&
            !signupData.confirmPassword.trim()
        ) {
            errors = {
                fullName: true,
                email: true,
                password: true,
                confirmPassword: true,
            };

            setFieldError(errors);
            setError("Please fill all fields");
            return;
        }

        if (!signupData.fullName.trim()) {
            errors.fullName = true;
            message = "Full name is required";
        }

        if (!signupData.email.trim()) {
            errors.email = true;
            message = message || "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(signupData.email)) {
            errors.email = true;
            message = message || "Enter a valid email";
        }

        if (!signupData.password.trim()) {
            errors.password = true;
            message = message || "Password is required";
        } else if (signupData.password.length < 6) {
            errors.password = true;
            message = message || "Password should be at least 6 characters";
        }

        if (!signupData.confirmPassword.trim()) {
            errors.confirmPassword = true;
            message = message || "Confirm your password";
        } else if (signupData.password !== signupData.confirmPassword) {
            errors.confirmPassword = true;
            message = message || "Passwords do not match";
        }

        setFieldError(errors);

        if (
            errors.fullName ||
            errors.email ||
            errors.password ||
            errors.confirmPassword
        ) {
            setError(message || "Please fix the errors");
            return;
        }

        setError("");
        setLoading(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                signupData.email,
                signupData.password
            );

            await updateProfile(userCredential.user, {
                displayName: signupData.fullName,
            });

            // Generate unique username for Supabase from full name
            const baseUsername = signupData.fullName
                ? signupData.fullName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
                : signupData.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            const username = `${baseUsername}${Math.floor(100 + Math.random() * 900)}`;

            // Create Supabase User Profile
            const { error: supabaseError } = await supabase
                .from("users")
                .insert({
                    id: userCredential.user.uid,
                    email: signupData.email,
                    full_name: signupData.fullName,
                    username: username,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });

            if (supabaseError) {
                console.error("Supabase insert error:", supabaseError);
                throw new Error("Could not sync user profile to database: " + supabaseError.message);
            }

            await AsyncStorage.setItem("user_logged_in", "true");

            setSuccess(true);
            alert("Account created successfully!");
            router.push("/(tabs)");
        } catch (error) {
            setError(mapAuthErrorToMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const handleSignin = async () => {
        let errors = {
            email: false,
            password: false,
        };

        let message = "";

        // ALL FIELDS EMPTY
        if (!signinData.email.trim() && !signinData.password.trim()) {
            errors.email = true;
            errors.password = true;

            setFieldError((prev) => ({ ...prev, ...errors }));
            setError("Please fill all fields");
            return;
        }

        // email validation
        if (!signinData.email.trim()) {
            errors.email = true;
            message = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(signinData.email)) {
            errors.email = true;
            message = "Enter a valid email";
        }

        // password validation
        if (!signinData.password.trim()) {
            errors.password = true;
            message = message || "Password is required";
        }

        setFieldError((prev) => ({ ...prev, ...errors }));

        if (errors.email || errors.password) {
            setError(message || "Please fix the errors");
            return;
        }

        setError("");
        setLoading(true);

        try {
            await signInWithEmailAndPassword(
                auth,
                signinData.email,
                signinData.password
            );

            await AsyncStorage.setItem("user_logged_in", "true");

            setSuccess(true);
            alert("Login successful!");
            router.push("/(tabs)");
        } catch (error) {
            setError(mapAuthErrorToMessage(error));
        } finally {
            setLoading(false);
        }
    };

  return (
    <ScrollView 
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
    >
        <View style={{ paddingTop: 15, paddingBottom: 15 }}>
            <Image 
                source={Logo}
                style={{
                    width: "100%",
                    height: 75,
                    resizeMode: "contain"
                }}
            />
        </View>

        <View style={{ flex: 1 }}>
            {/* Tab buttons — each has its own bottom border; blue when active, transparent otherwise */}
            <View style={[styles.authBtns, { borderBottomWidth: 2, borderBottomColor: '#C4C4C4' }]}>
                <TouchableOpacity 
                    onPress={() => setActive("signin")}
                    style={[styles.tabBtn, active === "signin" && styles.tabBtnActive]}
                >
                    <Text style={[styles.btn, active === "signin" && styles.activeText]}>{t('onboarding.signIn')}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    onPress={() => setActive("signup")}
                    style={[styles.tabBtn, active === "signup" && styles.tabBtnActive]}
                >
                    <Text style={[styles.btn, active === "signup" && styles.activeText]}>{t('onboarding.joinNow')}</Text>
                </TouchableOpacity>
            </View>

            {active === "signin" ? (
                <View>
                    <View style={styles.inputField}>

                        <FloatingInput
                            placeholder={t('auth.emailPlaceholder')}
                            value={signinData.email}
                            onChangeText={(text) => {
                                setEmail(text);
                                setSigninData({...signinData, email: text});
                                setFieldError({...fieldError, email: false});
                                setError("");
                            }}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            style={{borderColor: fieldError.email ? "red" : success ? "green" : "#ccc"}}
                        />

                        <FloatingInput
                            placeholder={t('auth.passwordPlaceholder')}
                            value={signinData.password}
                            onChangeText={(text) => {
                                setPassword(text);
                                setSigninData({...signinData, password: text});
                                setFieldError({...fieldError, password: false});
                                setError("");
                            }}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            style={{borderColor: fieldError.password ? "red" : success ? "green" : "#ccc"}}
                            secureTextEntry={!showPassword}
                            showToggle
                            onToggle={() => setShowPassword(!showPassword)}
                        />

                        {error ? (
                            <Text style={{color: "red", marginTop: 5, fontFamily: TYPOGRAHPY.regular}}>{error}</Text>
                        ) : null}

                        <View>
                            <TouchableOpacity 
                                onPress={()=> router.push("/(auth)/forgotpassword")}
                            >
                                <Text style={{textAlign: "right", fontFamily: TYPOGRAHPY.semiBold, fontSize: 16}}>{t('auth.forgotPassword')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={{marginTop: 25}}>
                        <Button 
                            text={t('onboarding.signIn')}
                            action={handleSignin}
                            bgColor={"#438def"}
                            textColor={"#FFFFFF"}
                            loading={loading}
                            style={{paddingVertical: 17}}
                        />
                    </View>

                    <View style={{flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 15}}>
                        <View style={{flex: 1, height: 1, backgroundColor: "#C4C4C4"}}/>
                        <Text style={{textAlign: "center", fontFamily: TYPOGRAHPY.regular, fontSize: 16, color: "#949494"}}>{t('auth.orContinueWith')}</Text>
                        <View style={{flex: 1, height: 1, backgroundColor: "#C4C4C4"}}/>
                    </View>

                    <View style={{flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 20, marginTop: 15}}>
                        <Button 
                            text={t('auth.googleAuth')}
                            bgColor={"#FFFFFF"}
                            textColor={"#656F78"}
                            icon={<GoogleIcon width={16} height={16}/>}
                            style={styles.authBtn}
                            action={handleGoogleSignIn}
                        />
                    </View>

                    <View style={{flexDirection: "row", justifyContent: "center", marginTop: 20}}>
                        <Text style={{fontFamily: TYPOGRAHPY.medium, fontSize: 16, color: "#656F78"}}>
                            {t('auth.dontHaveAccount') + " "}
                            <Text onPress={() => setActive("signup")} style={{ color: "#5398F1" }}>
                                {t('auth.createOne')}
                            </Text>
                        </Text>
                    </View>
                </View>
            ) : (
                <View>
                    <View style={[styles.inputField, { marginTop: 15 }]}>

                        <FloatingInput
                            placeholder={t('settings.selectLanguage') === 'Select Language' ? 'Full Name' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Nombre completo' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Nom complet' : 'Nome completo'}
                            value={signupData.fullName}
                            onChangeText={(text) => setSignupData({...signupData, fullName: text})}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            style={{borderColor: fieldError.fullName ? "red" : success ? "green" : "#ccc"}}

                        />

                        <FloatingInput
                            placeholder={t('settings.selectLanguage') === 'Select Language' ? 'Email' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Correo electrónico' : t('settings.selectLanguage') === 'Choisir la langue' ? 'E-mail' : 'E-mail'}
                            value={signupData.email}
                            onChangeText={(text) => setSignupData({...signupData, email: text})}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            style={{borderColor: fieldError.email ? "red" : success ? "green" : "#ccc"}}
                        />

                        <FloatingInput
                            placeholder={t('settings.selectLanguage') === 'Select Language' ? 'Password' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Contraseña' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Mot de passe' : 'Senha'}
                            value={signupData.password}
                            onChangeText={(text) => setSignupData({...signupData, password: text})}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            style={{borderColor: fieldError.password ? "red" : success ? "green" : "#ccc"}}
                            secureTextEntry={!showPassword}
                            showToggle
                            onToggle={() => setShowPassword(!showPassword)}
                        />

                        <FloatingInput
                            placeholder={t('settings.selectLanguage') === 'Select Language' ? 'Confirm Password' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Confirmar contraseña' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Confirmer le mot de passe' : 'Confirmar senha'}
                            value={signupData.confirmPassword}
                            onChangeText={(text) => setSignupData({...signupData, confirmPassword: text})}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            style={{borderColor: fieldError.confirmPassword ? "red" : success ? "green" : "#ccc"}}
                            secureTextEntry={!showConfirmPassword}
                            showToggle
                            onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                        />
                    </View>

                    {error ? (
                        <Text style={{color: "red", marginTop: 5, fontFamily: TYPOGRAHPY.regular}}>{error}</Text>
                    ) : null}

                    <View style={{marginTop: 20}}>
                        <Button 
                            text={t('settings.selectLanguage') === 'Select Language' ? 'Join Now' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Registrarse' : t('settings.selectLanguage') === 'Choisir la langue' ? 'S\'inscrire' : 'Cadastrar-se'}
                            action={handleSignup}
                            bgColor={"#438def"}
                            textColor={"#FFFFFF"}
                            loading={loading}
                            style={{paddingVertical: 17}}
                        />
                    </View>

                    <View style={{flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 15}}>
                        <View style={{flex: 1, height: 1, backgroundColor: "#C4C4C4"}}/>
                        <Text style={{textAlign: "center", fontFamily: TYPOGRAHPY.regular, fontSize: 16, color: "#949494"}}>
                            {t('settings.selectLanguage') === 'Select Language' ? 'Or Sign up with' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'O registrarse con' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Ou s\'inscrire avec' : 'Ou registrar-se com'}
                        </Text>
                        <View style={{flex: 1, height: 1, backgroundColor: "#C4C4C4"}}/>
                    </View>

                    <View style={{flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 20, marginTop: 12}}>
                        <Button 
                            text={"Google"}
                            bgColor={"#FFFFFF"}
                            textColor={"#656F78"}
                            icon={<GoogleIcon width={16} height={16}/>}
                            style={styles.authBtn}
                            action={handleGoogleSignIn}
                        />
                    </View>

                    <View style={{flexDirection: "row", justifyContent: "center", marginTop: 18}}>
                        <Text style={{fontFamily: TYPOGRAHPY.medium, fontSize: 16, color: "#656F78"}}>
                            {t('settings.selectLanguage') === 'Select Language' ? 'Already have an Account ' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? '¿Ya tienes una cuenta? ' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Vous avez déjà un compte ? ' : 'Já tem uma conta? '}
                            <Text onPress={() => setActive("signin")} style={{ color: "#5398F1" }}>
                                {t('settings.selectLanguage') === 'Select Language' ? 'Sign in' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Iniciar sesión' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Se connecter' : 'Entrar'}
                            </Text>
                        </Text>
                    </View>

                    <View style={{ marginTop: 18, alignItems: 'center', paddingHorizontal: 20, marginBottom: 25 }}>
                        <Text style={{ fontFamily: TYPOGRAHPY.regular, fontSize: 12, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 }}>
                            {t('settings.selectLanguage') === 'Select Language' ? 'By joining, you agree to our ' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Al unirte, aceptas nuestros ' : t('settings.selectLanguage') === 'Choisir la langue' ? 'En vous inscrivant, vous acceptez nos ' : 'Ao se registrar, você concorda com nossos '}
                            <Text 
                                onPress={handleShowTerms}
                                style={{ color: '#438def', fontFamily: TYPOGRAHPY.semiBold }}
                            >
                                {t('settings.selectLanguage') === 'Select Language' ? 'Terms & Conditions' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Términos y condiciones' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Conditions d\'utilisation' : 'Termos e Condições'}
                            </Text>
                            {t('settings.selectLanguage') === 'Select Language' ? ' and ' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? ' y la ' : t('settings.selectLanguage') === 'Choisir la langue' ? ' et notre ' : ' e '}
                            <Text 
                                onPress={handleShowPrivacy}
                                style={{ color: '#438def', fontFamily: TYPOGRAHPY.semiBold }}
                            >
                                {t('settings.selectLanguage') === 'Select Language' ? 'Privacy Policy' : t('settings.selectLanguage') === 'Seleccionar Idioma' ? 'Política de privacidad' : t('settings.selectLanguage') === 'Choisir la langue' ? 'Politique de confidentialité' : 'Política de Privacidade'}
                            </Text>
                        </Text>
                    </View>

                </View>
            )}
        </View>
    </ScrollView>
  )
}

export default Login

const styles = createResponsiveStyleSheet({
    authBtns: {
        flexDirection: "row",
        justifyContent: "flex-start",
        alignItems: "center",
        gap: 30,
    },

    tabBtn: {
        paddingBottom: 10,
        marginBottom: -2,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },

    tabBtnActive: {
        borderBottomColor: '#0779B8',
    },

    btn: {
        fontSize: 18,
        fontFamily: TYPOGRAHPY.regular,
        color: "#949494",
    },

    lines: {
        height: 2,
        width: "100%",
        backgroundColor: "#C4C4C4",
        marginTop: 15
    },

    active: {
        backgroundColor: "#0779B8",
        height: 2,
    },

    activeText: {
        fontFamily: TYPOGRAHPY.semiBold,
        color: "#0000009c",
    },

    inputContainer: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 10,
        paddingTop: 18,
        paddingHorizontal: 12,
    },

    label: {
        left: 12,
        color: "#999",
    },

    labelActive: {
        top: -3,
        fontSize: 12,
        backgroundColor: "#fff",
        paddingHorizontal: 4,
    },

    input: {
        height: 50,
        fontSize: 16,
    },

    inputField: {
        marginTop: 30,
    },

    authBtn: {
        paddingHorizontal: 35,
        paddingVertical: 10,
        borderRadius: 10,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#656F78",
        fontSize: 14,
        fontFamily: TYPOGRAHPY.medium,
    }
})